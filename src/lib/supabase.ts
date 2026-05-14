import { createClient } from '@supabase/supabase-js'

const url = (import.meta as any).env?.VITE_SUPABASE_URL || ''
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(String(url), String(key))

export function hasSupabaseConfigured() {
  return String(url).trim().length > 0 && String(key).trim().length > 0
}
