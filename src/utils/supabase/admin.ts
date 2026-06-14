import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Admin-Client mit Service Role Key.
 * Nur serverseitig (API Routes) verwenden!
 * Ermöglicht Admin-Operationen wie Passwort-Reset und User-Erstellung.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt in den Umgebungsvariablen.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
