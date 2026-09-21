import { createClient } from '@supabase/supabase-js';

// 1. Setup Supabase
// Pastikan untuk mengganti nilai ini dengan URL dan Anon Key dari project Supabase Anda.
// Sangat disarankan menggunakan environment variables (import.meta.env.VITE_SUPABASE_URL).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://unhwnznhwltgpyzdzfah.supabase.co'; // Ganti dengan URL Supabase
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaHduem5od2x0Z3B5emR6ZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTIzMzgsImV4cCI6MjA5NzM2ODMzOH0.ZcHii3HV1P8mznDJHgwWAjMIcoORz2zdhwgZT0luto8'; // Ganti dengan Anon/Public Key Supabase

// Inisialisasi Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Fungsi Pendaftaran (Sign Up)
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// 3. Fungsi Masuk Email/Password (Sign In)
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

// 3.5. Fungsi Masuk dengan Google (OAuth)
export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Pastikan URL situs Anda diizinkan (Redirect URLs) di Supabase Dashboard
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
  return data;
};

// 4. Fungsi Mendapatkan User (Cek Sesi Login Aktif)
export const getCurrentUser = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    return null; // Return null jika tidak ada sesi atau error
  }
  return user;
};

// 5. Fungsi Keluar (Sign Out)
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
