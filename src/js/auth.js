// ============================================
// Auth Module — Supabase Authentication
// ============================================

import { supabase, isConfigured } from './supabase.js';

const DEMO_PASSWORD = 'admin123';
const ADMIN_EMAIL = 'admin@hps.edu';

let sessionCache = null;

// Listen for auth state changes
if (isConfigured()) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    sessionCache = session;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    sessionCache = session;
  });
}

/**
 * Attempt login
 */
export async function login(password) {
  if (!isConfigured()) {
    // Demo mode
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem('hps_admin_session', 'demo');
      return { success: true };
    }
    return { success: false, message: 'Invalid password' };
  }

  // Real Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: password
  });

  if (error) {
    return { success: false, message: error.message };
  }
  
  sessionCache = data.session;
  return { success: true };
}

/**
 * Check if admin is logged in
 */
export function isLoggedIn() {
  if (!isConfigured()) {
    return !!sessionStorage.getItem('hps_admin_session');
  }
  return !!sessionCache;
}

/**
 * Logout
 */
export async function logout() {
  if (!isConfigured()) {
    sessionStorage.removeItem('hps_admin_session');
    return;
  }
  await supabase.auth.signOut();
  sessionCache = null;
}

/**
 * Change admin password
 */
export async function changePassword(currentPwd, newPwd) {
  if (!isConfigured()) {
    return { success: true, message: 'Password updated (demo mode)' };
  }

  // With Supabase Auth, we first re-authenticate to verify the current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: currentPwd
  });

  if (signInError) {
    return { success: false, message: 'Current password is incorrect' };
  }

  // Then we update to the new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPwd
  });

  if (updateError) {
    return { success: false, message: updateError.message };
  }
  
  return { success: true, message: 'Password updated successfully' };
}
