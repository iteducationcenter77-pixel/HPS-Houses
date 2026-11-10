// ============================================
// Auth Module — admin sign-in via the site API
// ============================================

import { api } from './api.js';

let loggedIn = false;
let localReset = false;

/**
 * Ask the server whether this browser has a valid admin session
 */
export async function checkSession() {
  try {
    const session = await api('auth.session');
    loggedIn = session.loggedIn;
    localReset = !!session.canLocalReset;
  } catch {
    loggedIn = false;
    localReset = false;
  }
  return loggedIn;
}

/**
 * True when the site is open on the owner's own computer, where the admin
 * password can be set or reset without knowing the old one
 */
export function canLocalReset() {
  return localReset;
}

/**
 * Set a new admin password (owner's computer only) and sign in
 */
export async function resetPasswordLocally(password) {
  try {
    await api('auth.localReset', { password });
    loggedIn = true;
    return { success: true };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Attempt login
 */
export async function login(password) {
  try {
    await api('auth.login', { password });
    loggedIn = true;
    return { success: true };
  } catch (err) {
    loggedIn = false;
    return { success: false, message: err.message };
  }
}

/**
 * Check if admin is logged in (as of the last server answer)
 */
export function isLoggedIn() {
  return loggedIn;
}

/**
 * Logout
 */
export async function logout() {
  loggedIn = false;
  try {
    await api('auth.logout');
  } catch (err) {
    console.error('Logout failed:', err);
  }
}

/**
 * Change admin password
 */
export async function changePassword(currentPwd, newPwd) {
  try {
    await api('auth.changePassword', { current: currentPwd, next: newPwd });
    return { success: true, message: 'Password updated successfully' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
