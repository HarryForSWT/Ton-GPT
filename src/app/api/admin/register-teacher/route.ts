import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/admin/register-teacher
 * Body: { email: string, password: string, display_name: string }
 * 
 * Registriert einen neuen Lehrer. Nur Lehrer dürfen diese Route aufrufen.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Prüfen ob der User ein Lehrer ist
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Nicht eingeloggt.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json({ error: 'Keine Berechtigung.' }, { status: 403 });
    }

    // 2. Daten aus dem Request-Body lesen
    const body = await request.json();
    const { email, password, display_name } = body;

    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'E-Mail, Passwort und Anzeigename sind erforderlich.' }, { status: 400 });
    }

    // 3. Neuen Lehrer mit Admin-Client erstellen
    const adminClient = createAdminClient();
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // E-Mail direkt bestätigen
      user_metadata: {
        display_name,
        role: 'teacher',
      },
    });

    if (error) {
      return NextResponse.json(
        { error: `Lehrer konnte nicht erstellt werden: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, userId: newUser.user?.id });
  } catch (err) {
    console.error('Lehrer-Registrierung Fehler:', err);
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 }
    );
  }
}
