// ============================================
// Charts — Points Distribution Donut Chart
// ============================================

/**
 * Render points distribution donut chart using Canvas
 */
export function renderPointsChart(houses) {
  const canvas = document.getElementById('points-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = canvas.width = canvas.height = 320;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 120;
  const innerRadius = 75;

  const totalPoints = houses.reduce((sum, h) => sum + (h.total_points || 0), 0);
  if (totalPoints === 0) {
    ctx.fillStyle = '#8a94a6';
    ctx.font = '500 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No points yet', centerX, centerY);
    return;
  }

  const sorted = [...houses].sort((a, b) => b.total_points - a.total_points);
  let startAngle = -Math.PI / 2;
  const segments = [];

  sorted.forEach(house => {
    const sliceAngle = (house.total_points / totalPoints) * Math.PI * 2;
    segments.push({ house, startAngle, endAngle: startAngle + sliceAngle, color: house.color_hex });
    startAngle += sliceAngle;
  });

  // Animate
  let progress = 0;
  function draw() {
    progress = Math.min(progress + 0.025, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ctx.clearRect(0, 0, size, size);

    segments.forEach(seg => {
      const currentEnd = seg.startAngle + (seg.endAngle - seg.startAngle) * eased;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, seg.startAngle, currentEnd);
      ctx.arc(centerX, centerY, innerRadius, currentEnd, seg.startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Gap
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentEnd - 0.02, currentEnd);
      ctx.arc(centerX, centerY, innerRadius, currentEnd, currentEnd - 0.02, true);
      ctx.closePath();
      ctx.fillStyle = '#0a1628';
      ctx.fill();
    });

    // Center text
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(totalPoints * eased), centerX, centerY - 8);
    ctx.fillStyle = '#8a94a6';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('TOTAL POINTS', centerX, centerY + 16);

    if (progress < 1) requestAnimationFrame(draw);
  }
  draw();

  // Legend
  const legend = document.getElementById('chart-legend');
  if (legend) {
    legend.innerHTML = sorted.map(h => {
      const pct = totalPoints > 0 ? ((h.total_points / totalPoints) * 100).toFixed(1) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0">
          <span class="house-dot" style="background:${h.color_hex}"></span>
          <span style="color:var(--text-secondary);font-size:var(--font-sm);flex:1">${h.name}</span>
          <span style="color:var(--white);font-weight:600;font-size:var(--font-sm)">${h.total_points} pts</span>
          <span style="color:var(--text-muted);font-size:var(--font-xs)">${pct}%</span>
        </div>
      `;
    }).join('');
  }
}
