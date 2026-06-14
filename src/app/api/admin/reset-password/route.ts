import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/admin/reset-password
 * Body: { studentId: string }
 * 
 * Setzt das Passwort eines Schülers auf "123456".
 * Nur Lehrer dürfen diese Route aufrufen.
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

    // 2. Student-ID aus dem Request-Body lesen
    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Schüler-ID fehlt.' }, { status: 400 });
    }

    // 3. Passwort mit Admin-Client zurücksetzen
    const adminClient = createAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(studentId, {
      password: '123456',
    });

    if (error) {
      return NextResponse.json(
        { error: `Passwort konnte nicht zurückgesetzt werden: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Passwort-Reset Fehler:', err);
    return NextResponse.json(
      { error: 'Interner Serverfehler.' },
      { status: 500 }
    );
  }
}
