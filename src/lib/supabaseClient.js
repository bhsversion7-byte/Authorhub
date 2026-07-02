import { createClient } from "@supabase/supabase-js";

const viteEnv = import.meta.env ?? {};
const url = viteEnv.VITE_SUPABASE_URL;
const anonKey = viteEnv.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(url && anonKey);

export const supabase = hasSupabaseConfig
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    })
  : null;

const LOCAL_AUTH_KEY = "author-hub-local-auth-user";
const LOCAL_AUTH_EXPIRES_KEY = "author-hub-local-auth-user-expires";
const SESSION_AUTH_KEY = "author-hub-session-auth-user";
const REMEMBER_AUTH_MS = 30 * 24 * 60 * 60 * 1000;

export function getLocalAuthUser() {
  try {
    const sessionUser = JSON.parse(window.sessionStorage.getItem(SESSION_AUTH_KEY) || "null");
    if (sessionUser) return sessionUser;

    const expiresAt = Number(window.localStorage.getItem(LOCAL_AUTH_EXPIRES_KEY));
    if (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt < Date.now()) {
      setLocalAuthUser(null);
      return null;
    }

    return JSON.parse(window.localStorage.getItem(LOCAL_AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function setLocalAuthUser(user, options = {}) {
  const persistent = Object.prototype.hasOwnProperty.call(options, "persistent")
    ? options.persistent !== false
    : !window.sessionStorage.getItem(SESSION_AUTH_KEY);
  if (!user) {
    window.localStorage.removeItem(LOCAL_AUTH_KEY);
    window.localStorage.removeItem(LOCAL_AUTH_EXPIRES_KEY);
    window.sessionStorage.removeItem(SESSION_AUTH_KEY);
    return;
  }

  if (persistent) {
    window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    window.localStorage.setItem(LOCAL_AUTH_EXPIRES_KEY, String(Date.now() + REMEMBER_AUTH_MS));
    window.sessionStorage.removeItem(SESSION_AUTH_KEY);
  } else {
    window.sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(user));
    window.localStorage.removeItem(LOCAL_AUTH_KEY);
    window.localStorage.removeItem(LOCAL_AUTH_EXPIRES_KEY);
  }
}

export function makeLocalUser(email) {
  const safeEmail = email.trim().toLowerCase();
  return {
    id: `local-${safeEmail}`,
    email: safeEmail,
    user_metadata: {
      username: safeEmail.split("@")[0] || "writer",
    },
    app_metadata: {
      provider: "local-fallback",
    },
  };
}
