// CDN-delivered SDKs for browser runtime

export async function loadSupabaseClient() {
  if (window.supabase) {
    return window.supabase;
  }

  await import(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm"
  );

  return window.supabase;
}