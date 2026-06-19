import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Storage } from '@plasmohq/storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '~utils/constants';

const storage = new Storage({ area: 'local' });

let instance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!instance) {
    instance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: (key) => storage.get<string>(key).then(v => v ?? null),
          setItem: (key, value) => storage.set(key, value).then(() => {}),
          removeItem: (key) => storage.remove(key).then(() => {}),
        },
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return instance;
}
