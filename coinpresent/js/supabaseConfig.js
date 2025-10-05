// Supabase configuration
// IMPORTANT: Replace YOUR_ANON_KEY_HERE with your actual Supabase anon public key
// 
// To find your keys:
// 1. Go to https://supabase.com/dashboard
// 2. Select your project
// 3. Go to Settings > API
// 4. Copy the "anon public" key (starts with "eyJ...")
//
// See SUPABASE_SETUP.md for detailed setup instructions

export const supabaseConfig = {
  // Your Supabase project URL
  url: "https://nmrcinrgwfxmsqjkspgt.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tcmNpbnJnd2Z4bXNxamtzcGd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODQyMDAsImV4cCI6MjA3NTE2MDIwMH0.cqZ6XmvFqLN4-UBa_6sBdPmbVh_DGVzFHmOYpRv4hxw",
  
  // Storage bucket names
  storageBucket: "coin-media",
  datasetsBucket: "coin-datasets",
};