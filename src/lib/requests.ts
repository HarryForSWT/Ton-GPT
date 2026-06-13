import { createClient } from '@/utils/supabase/client';

export type RequestStatus = 'pending' | 'reviewed';

export interface PronunciationRequest {
  id: string;
  student_id: string;
  teacher_id: string | null;
  hanzi: string;
  pinyin: string;
  pinyin_number?: string;
  german_meaning?: string;
  student_audio_url: string | null;
  status: RequestStatus;
  created_at: string;
  // joined
  profiles?: { display_name: string; email: string } | null;
}

export interface TeacherResponse {
  id: string;
  request_id: string;
  teacher_id: string;
  comment: string | null;
  audio_url: string;
  audio_duration: number | null;
  created_at: string;
  profiles?: { display_name: string; email: string } | null;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Upload an audio Blob to Supabase Storage.
 * Returns the storage path (not a public URL).
 */
export async function uploadAudio(
  bucket: 'student-audio' | 'teacher-audio',
  path: string,
  blob: Blob
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      contentType: blob.type || 'audio/webm',
      upsert: false,
    });

  if (error) throw new Error(`Audio-Upload fehlgeschlagen: ${error.message}`);
  return data.path;
}

/**
 * Get a short-lived signed URL for playback (valid 60 minutes).
 */
export async function getSignedAudioUrl(
  bucket: 'student-audio' | 'teacher-audio',
  path: string
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error) throw new Error(`URL-Generierung fehlgeschlagen: ${error.message}`);
  return data.signedUrl;
}

// ─── Pronunciation Requests ───────────────────────────────────────────────────

/**
 * Schüler: Neue Aussprache-Anfrage erstellen.
 */
export async function createPronunciationRequest(data: {
  hanzi: string;
  pinyin: string;
  pinyin_number?: string;
  german_meaning?: string;
  student_audio_url?: string;
}): Promise<PronunciationRequest> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  const { data: result, error } = await supabase
    .from('pronunciation_requests')
    .insert({
      student_id: user.id,
      hanzi: data.hanzi,
      pinyin: data.pinyin,
      pinyin_number: data.pinyin_number ?? null,
      german_meaning: data.german_meaning ?? null,
      student_audio_url: data.student_audio_url ?? null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Anfrage konnte nicht erstellt werden: ${error.message}`);
  return result as PronunciationRequest;
}

/**
 * Schüler: Eigene Anfragen laden.
 */
export async function getMyRequests(): Promise<PronunciationRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pronunciation_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PronunciationRequest[];
}

/**
 * Schüler/Lehrer: Einzelne Anfrage laden.
 */
export async function getRequestById(id: string): Promise<PronunciationRequest | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pronunciation_requests')
    .select('*, profiles:profiles!student_id(display_name, email)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as PronunciationRequest;
}

/**
 * Lehrer: Alle Anfragen laden (mit Schüler-Profil-Daten).
 */
export async function getAllRequests(): Promise<PronunciationRequest[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('pronunciation_requests')
    .select('*, profiles:profiles!student_id(display_name, email)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PronunciationRequest[];
}

// ─── Teacher Responses ────────────────────────────────────────────────────────

/**
 * Lehrer-Feedback zu einer Anfrage laden.
 */
export async function getResponseForRequest(requestId: string): Promise<TeacherResponse | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('teacher_responses')
    .select('*, profiles:profiles!teacher_id(display_name, email)')
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) return null;
  return data as TeacherResponse | null;
}

/**
 * Lehrer: Feedback absenden + Anfrage-Status auf "reviewed" setzen.
 */
export async function submitTeacherResponse(data: {
  request_id: string;
  comment: string;
  audio_url: string;
  audio_duration?: number;
}): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nicht eingeloggt');

  // Feedback eintragen
  const { error: responseError } = await supabase
    .from('teacher_responses')
    .insert({
      request_id: data.request_id,
      teacher_id: user.id,
      comment: data.comment || null,
      audio_url: data.audio_url,
      audio_duration: data.audio_duration ?? null,
    });

  if (responseError) throw new Error(`Feedback konnte nicht gespeichert werden: ${responseError.message}`);

  // Status der Anfrage auf "reviewed" setzen
  const { error: updateError } = await supabase
    .from('pronunciation_requests')
    .update({ status: 'reviewed', teacher_id: user.id })
    .eq('id', data.request_id);

  if (updateError) throw new Error(`Status konnte nicht aktualisiert werden: ${updateError.message}`);
}
