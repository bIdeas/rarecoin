// CDN-delivered SDKs for browser runtime

export async function loadSupabaseClient() {
  if (window.supabase) {
    return window.supabase;
  }

  try {
    const supabaseModule = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm"
    );
    
    // The module exports createClient directly
    window.supabase = supabaseModule;
    return supabaseModule;
  } catch (error) {
    console.error("Failed to load Supabase client from CDN:", error);
    throw error;
  }
}