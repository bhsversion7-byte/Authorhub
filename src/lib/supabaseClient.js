import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

export function getLocalAuthUser() {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export function setLocalAuthUser(user) {
  if (!user) window.localStorage.removeItem(LOCAL_AUTH_KEY);
  else window.localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
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
