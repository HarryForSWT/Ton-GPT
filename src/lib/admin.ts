import { createClient } from '@/utils/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  display_name: string;
  email: string;
  role: 'student' | 'teacher';
  assigned_teacher_id: string | null;
  created_at: string;
  assigned_teacher?: { display_name: string; email: string } | null;
}

export interface PasswordResetRequest {
  id: string;
  student_id: string;
  status: 'pending' | 'resolved';
  created_at: string;
  profiles?: { display_name: string; email: string } | null;
}

// ─── Schüler-Verwaltung ───────────────────────────────────────────────────────

/**
 * Lehrer: Alle Schülerprofile laden.
 */
export async function getAllStudents(): Promise<StudentProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, assigned_teacher:profiles!assigned_teacher_id(display_name, email)')
    .eq('role', 'student')
    .order('display_name', { ascending: true });

  if (error) throw new Error(`Schüler konnten nicht geladen werden: ${error.message}`);
  return (data ?? []) as StudentProfile[];
}

/**
 * Lehrer: Alle Lehrerprofile laden.
 */
export async function getAllTeachers(): Promise<StudentProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'teacher')
    .order('display_name', { ascending: true });

  if (error) throw new Error(`Lehrer konnten nicht geladen werden: ${error.message}`);
  return (data ?? []) as StudentProfile[];
}

/**
 * Lehrer: Schüler einem Lehrer zuordnen (direkt, ohne Genehmigung).
 */
export async function assignStudent(studentId: string, teacherId: string | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ assigned_teacher_id: teacherId })
    .eq('id', studentId);

  if (error) throw new Error(`Zuordnung fehlgeschlagen: ${error.message}`);
}

// ─── Passwort-Reset-Anfragen ──────────────────────────────────────────────────

/**
 * Lehrer: Alle offenen Passwort-Reset-Anfragen laden.
 */
export async function getPendingPasswordResets(): Promise<PasswordResetRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*, profiles:profiles!student_id(display_name, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Passwort-Anfragen konnten nicht geladen werden: ${error.message}`);
  return (data ?? []) as PasswordResetRequest[];
}

/**
 * Lehrer: Passwort-Reset-Anfrage als erledigt markieren.
 */
export async function resolvePasswordReset(requestId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('password_reset_requests')
    .update({ status: 'resolved' })
    .eq('id', requestId);

  if (error) throw new Error(`Anfrage konnte nicht aktualisiert werden: ${error.message}`);
}
