// ============================================
// Auth Module — Simple password-based admin auth
// ============================================

import { supabase, isConfigured } from './supabase.js';

const SESSION_KEY = 'hps_admin_session';
const DEMO_PASSWORD = 'admin123';

/**
 * Attempt login
 */
export async function login(password) {
  if (!isConfigured()) {
    // Demo mode
    if (password === DEMO_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'demo');
      return true;
    }
    return false;
  }

  const { data, error } = await supabase
    .from('admin_settings')
    .select('admin_password_hash')
    .eq('id', 1)
    .single();

  if (error || !data) return false;
  if (data.admin_password_hash === password) {
    sessionStorage.setItem(SESSION_KEY, 'authenticated');
    return true;
  }
  return false;
}

/**
 * Check if admin is logged in
 */
export function isLoggedIn() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

/**
 * Logout
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Change admin password
 */
export async function changePassword(currentPwd, newPwd) {
  if (!isConfigured()) {
    return { success: true, message: 'Password updated (demo mode)' };
  }

  const { data } = await supabase
    .from('admin_settings')
    .select('admin_password_hash')
    .eq('id', 1)
    .single();

  if (!data || data.admin_password_hash !== currentPwd) {
    return { success: false, message: 'Current password is incorrect' };
  }

  const { error } = await supabase
    .from('admin_settings')
    .update({ admin_password_hash: newPwd, updated_at: new Date().toISOString() })
    .eq('id', 1);

  if (error) return { success: false, message: 'Failed to update password' };
  return { success: true, message: 'Password updated successfully' };
}
