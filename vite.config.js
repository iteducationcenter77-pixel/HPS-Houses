import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';

const SERVER_ENV_KEYS = ['MONGODB_URI', 'MONGODB_DB', 'AUTH_SECRET'];

// Public pages of the school website (each is its own HTML file).
export const PAGES = ['index', 'about', 'academics', 'houses', 'gallery', 'news', 'admissions', 'contact'];

/**
 * Serves the API (/api/rpc, /api/media) from the local dev/preview server, using the
 * same code that runs as Vercel Functions in production, and maps clean page
 * addresses (/about → about.html) the way Vercel's cleanUrls does.
 */
function hpsServer() {
  const routes = [
    ['/api/rpc', 'handleRpc', '/server/handler.js'],
    ['/api/media', 'handleMedia', '/server/media.js'],
  ];

  function attach(server, loadModule) {
    // /about → /about.html, /events → /news.html (old site address)
    server.middlewares.use((req, _res, next) => {
      const [path, query = ''] = req.url.split('?');
      const name = path.replace(/^\/|\/$/g, '');
      const target = name === 'events' ? 'news' : name;
      if (PAGES.includes(target) && target !== 'index') req.url = `/${target}.html${query ? `?${query}` : ''}`;
      next();
    });

    for (const [route, exportName, file] of routes) {
      server.middlewares.use(route, async (req, res) => {
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(key, value);
          }
          // Mark requests that truly come from this computer. The API uses this to
          // allow the "set admin password" form; it never trusts a client-sent copy.
          headers.delete('x-hps-local');
          const from = req.socket.remoteAddress;
          if (from === '127.0.0.1' || from === '::1' || from === '::ffff:127.0.0.1') headers.set('x-hps-local', '1');

          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(`http://${req.headers.host}${req.originalUrl}`, {
            method: req.method,
            headers,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });

          const mod = await loadModule(file);
          const response = await mod[exportName](request);

          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            if (key !== 'set-cookie') res.setHeader(key, value);
          });
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader('Set-Cookie', cookies);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          console.error('[api] dev server error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Something went wrong on the server' }));
        }
      });
    }
  }

  return {
    name: 'hps-server',
    config(_config, { mode }) {
      // Make the server-side secrets from .env files visible to the API code.
      // Values set in the real environment win; values we copied from a file are
      // refreshed whenever the file changes and the dev server restarts.
      const fromFile = (globalThis.__hpsEnvFromFile ??= new Set());
      const env = loadEnv(mode, process.cwd(), '');
      for (const key of SERVER_ENV_KEYS) {
        if (env[key] && (!process.env[key] || fromFile.has(key))) {
          process.env[key] = env[key];
          fromFile.add(key);
        }
      }
    },
    configureServer(server) {
      attach(server, (file) => server.ssrLoadModule(file));
    },
    configurePreviewServer(server) {
      attach(server, (file) => import(`.${file}`));
    },
  };
}

export default defineConfig({
  plugins: [hpsServer()],
  build: {
    rollupOptions: {
      input: Object.fromEntries([
        ...PAGES.map((page) => [page, resolve(__dirname, `${page}.html`)]),
        ['admin', resolve(__dirname, 'admin.html')],
      ]),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
