import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'fey_supabase_url';
const STORAGE_KEY_KEY = 'fey_supabase_anon_key';

/**
 * Sanitiza la URL de Supabase removiendo rutas REST o barras finales si fueron copiadas por error.
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');
  return url;
}

/**
 * Obtiene la URL de Supabase configurada desde localStorage o variables de entorno.
 */
export function getSupabaseUrl(): string {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  if (customUrl && customUrl.trim()) return sanitizeSupabaseUrl(customUrl);
  return sanitizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
}

/**
 * Obtiene la Anon Key de Supabase configurada desde localStorage o variables de entorno.
 */
export function getSupabaseAnonKey(): string {
  const customKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : null;
  if (customKey && customKey.trim()) return customKey.trim();
  return (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

/**
 * Guarda credenciales personalizadas en localStorage.
 */
export function setCustomSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    const cleanUrl = sanitizeSupabaseUrl(url);
    const cleanKey = anonKey.trim();
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
    localStorage.setItem(STORAGE_KEY_KEY, cleanKey);
    cachedClient = null; // Reiniciar cliente
  }
}

/**
 * Limpia credenciales personalizadas de localStorage.
 */
export function clearCustomSupabaseCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    cachedClient = null;
  }
}

/**
 * Verifica si las credenciales de Supabase están configuradas con valores válidos.
 */
export function isSupabaseConfigured(): boolean {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  return Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('tu-proyecto') &&
    !key.includes('tu-clave')
  );
}

let cachedClient: SupabaseClient | null = null;

/**
 * Retorna el cliente Supabase configurado o null si no se han cargado credenciales.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!cachedClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }

  return cachedClient;
}
