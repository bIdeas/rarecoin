// Storage abstraction layering Supabase buckets and fallbacks

import { loadSupabaseClient } from "./cdnClients.js";
import { supabaseConfig } from "./supabaseConfig.js";

let supabaseInstance = null;
let storageInitialized = false;

export async function initializeStorage() {
  if (storageInitialized) {
    console.log("Storage already initialized");
    return;
  }
  
  console.log("Storage module initialized");
  storageInitialized = true;
  
  // Pre-initialize Supabase client
  try {
    await ensureSupabase();
  } catch (error) {
    console.warn("Supabase initialization failed, will use fallback storage", error);
  }
}

async function ensureSupabase() {
  if (supabaseInstance) return supabaseInstance;
  const { createClient } = await loadSupabaseClient();
  supabaseInstance = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  return supabaseInstance;
}

export async function uploadMediaFile(file, path) {
  const supabase = await ensureSupabase();
  const { data, error } = await supabase.storage
    .from(supabaseConfig.storageBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;
  return data;
}

export async function getPublicMediaUrl(path) {
  const supabase = await ensureSupabase();
  const { data } = supabase.storage
    .from(supabaseConfig.storageBucket)
    .getPublicUrl(path);
  return data.publicUrl;
}

export async function downloadDataset(filename) {
  const supabase = await ensureSupabase();
  const { data, error } = await supabase.storage
    .from(supabaseConfig.datasetsBucket)
    .download(filename);

  if (error) throw error;
  const text = await data.text();
  return JSON.parse(text);
}

export async function uploadDataset(filename, json) {
  const supabase = await ensureSupabase();
  const blob = new Blob([JSON.stringify(json, null, 2)], {
    type: "application/json",
  });

  const { error } = await supabase.storage
    .from(supabaseConfig.datasetsBucket)
    .upload(filename, blob, {
      cacheControl: "0",
      upsert: true,
      contentType: "application/json",
    });

  if (error) throw error;
}