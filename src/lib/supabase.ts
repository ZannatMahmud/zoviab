import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://lsxaxytddagpepqtmrkg.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzeGF4eXRkZGFncGVwcXRtcmtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQwMzc4NzUsImV4cCI6MjEwOTYxMzg3NX0.E4Il9bLKIKK01zyDbNOqWLHO36gawJdadmmeRMr1VcE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
