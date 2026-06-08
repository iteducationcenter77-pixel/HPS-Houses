// ============================================
// Supabase Client Configuration
// ============================================

import { createClient } from '@supabase/supabase-js';

// Supabase project credentials
const SUPABASE_URL = 'https://mauqclwfdajqjctxnoqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hdXFjbHdmZGFqcWpjdHhub3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTUwMzMsImV4cCI6MjA5NjQ3MTAzM30.5pK1HIY8542EWZfNlyJ31MIfp40yRk8msAegN3WYEW0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is configured
export function isConfigured() {
  return !SUPABASE_URL.includes('your-project') && !SUPABASE_ANON_KEY.includes('your-anon-key');
}
