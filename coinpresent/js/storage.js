// Storage abstraction layering Supabase buckets and fallbacks
// Uses signed URLs for secure access to private buckets with session caching

import { loadSupabaseClient } from "./cdnClients.js";
import { supabaseConfig } from "./supabaseConfig.js";

let supabaseInstance = null;
let storageInitialized = false;

// Session storage keys
const STORAGE_CACHE_KEY = "rarecoin_signed_urls";
const DATASET_CACHE_KEY = "rarecoin_dataset_cache";

// Cache structure: { url: string, expiresAt: timestamp }
let signedUrlCache = {};
let datasetCache = {};

export async function initializeStorage() {
  if (storageInitialized) {
    console.log("Storage already initialized");
    return;
  }
  
  console.log("Storage module initialized");
  storageInitialized = true;
  
  // Load cached signed URLs from sessionStorage
  loadCacheFromSession();
  
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

// Load cache from sessionStorage
function loadCacheFromSession() {
  try {
    const cachedUrls = sessionStorage.getItem(STORAGE_CACHE_KEY);
    const cachedDatasets = sessionStorage.getItem(DATASET_CACHE_KEY);
    
    if (cachedUrls) {
      signedUrlCache = JSON.parse(cachedUrls);
      // Clean expired entries
      const now = Date.now();
      Object.keys(signedUrlCache).forEach(key => {
        if (signedUrlCache[key].expiresAt < now) {
          delete signedUrlCache[key];
        }
      });
    }
    
    if (cachedDatasets) {
      datasetCache = JSON.parse(cachedDatasets);
    }
  } catch (error) {
    console.warn("Failed to load cache from session storage", error);
    signedUrlCache = {};
    datasetCache = {};
  }
}

// Save cache to sessionStorage
function saveCacheToSession() {
  try {
    sessionStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(signedUrlCache));
    sessionStorage.setItem(DATASET_CACHE_KEY, JSON.stringify(datasetCache));
  } catch (error) {
    console.warn("Failed to save cache to session storage", error);
  }
}

// Get or create signed URL for media files (6000 seconds = 100 minutes)
export async function getSignedMediaUrl(path) {
  const cacheKey = `media:${path}`;
  const now = Date.now();
  
  // Check if we have a valid cached URL
  if (signedUrlCache[cacheKey] && signedUrlCache[cacheKey].expiresAt > now) {
    console.log(`Using cached signed URL for: ${path}`);
    return signedUrlCache[cacheKey].url;
  }
  
  // Generate new signed URL
  console.log(`Generating signed URL for: ${path}`);
  const supabase = await ensureSupabase();
  const { data, error } = await supabase.storage
    .from(supabaseConfig.storageBucket)
    .createSignedUrl(path, 6000); // 6000 seconds
  
  if (error) throw error;
  
  // Cache the URL with expiration time (subtract 60 seconds as buffer)
  signedUrlCache[cacheKey] = {
    url: data.signedUrl,
    expiresAt: now + (6000 - 60) * 1000
  };
  
  saveCacheToSession();
  return data.signedUrl;
}

// Upload media file
export async function uploadMediaFile(file, path) {
  const supabase = await ensureSupabase();
  const { data, error } = await supabase.storage
    .from(supabaseConfig.storageBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) throw error;
  
  // Invalidate cache for this path
  const cacheKey = `media:${path}`;
  delete signedUrlCache[cacheKey];
  saveCacheToSession();
  
  return data;
}

// Download dataset with caching (60 seconds signed URL)
export async function downloadDataset(filename) {
  const cacheKey = `dataset:${filename}`;
  
  // Check if we have cached dataset data
  if (datasetCache[cacheKey]) {
    console.log(`Using cached dataset: ${filename}`);
    return datasetCache[cacheKey];
  }
  
  console.log(`Downloading dataset: ${filename}`);
  const supabase = await ensureSupabase();
  
  // Create signed URL for dataset (60 seconds)
  const { data: urlData, error: urlError } = await supabase.storage
    .from(supabaseConfig.datasetsBucket)
    .createSignedUrl(filename, 60);
  
  if (urlError) throw urlError;
  
  // Fetch the data using the signed URL
  const response = await fetch(urlData.signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }
  
  const jsonData = await response.json();
  
  // Cache the dataset data for the session
  datasetCache[cacheKey] = jsonData;
  saveCacheToSession();
  
  return jsonData;
}

// Upload dataset
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
  
  // Invalidate cache for this dataset
  const cacheKey = `dataset:${filename}`;
  delete datasetCache[cacheKey];
  saveCacheToSession();
}

// Clear all caches (useful for logout or manual refresh)
export function clearStorageCache() {
  signedUrlCache = {};
  datasetCache = {};
  sessionStorage.removeItem(STORAGE_CACHE_KEY);
  sessionStorage.removeItem(DATASET_CACHE_KEY);
  console.log("Storage cache cleared");
}