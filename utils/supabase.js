// utils/supabase.js
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project keys
const supabaseUrl = 'https://dxecarqiilzzwsytyqep.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4ZWNhcnFpaWx6endzeXR5cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MDA3MTMsImV4cCI6MjA5MDI3NjcxM30.kYvwruCjlpPuHtyJIeGmD070Yt47K2ioyoHWRBr1Yxo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});