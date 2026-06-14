import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendTeacherSummaryEmail, sendStudentFeedbackEmail } from '@/lib/email';

// Optional: Security to ensure only Vercel Cron can call this
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Validate Vercel cron secret if set
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createAdminClient();

  try {
    // 1. Process Un-emailed Teacher Responses (Feedback from teacher -> Student)
    const { data: unsentResponses, error: responsesErr } = await supabase
      .from('teacher_responses')
      .select(`
        id,
        request_id,
        pronunciation_requests (
           student_id,
           german_meaning,
           hanzi,
           profiles!pronunciation_requests_student_id_fkey (
             id,
             email,
             display_name,
             wants_email_notifications
           )
        )
      `)
      .is('emailed_at', null);

    if (responsesErr) throw responsesErr;

    // Group responses by student_id
    const studentEmailsToSent = new Map<string, { email: string, name: string, topics: string[], responseIds: string[] }>();

    for (const response of unsentResponses || []) {
      const pr = Array.isArray(response.pronunciation_requests) ? response.pronunciation_requests[0] : response.pronunciation_requests;
      if (!pr) continue;
      
      const studentProfile = Array.isArray(pr.profiles) ? pr.profiles[0] : pr.profiles;
      if (!studentProfile || !studentProfile.wants_email_notifications) continue; // Skip fake emails or opt-outs

      const studentId = studentProfile.id;
      const topic = `Aussprache-Feedback für "${pr.hanzi}" (${pr.german_meaning || ''})`;

      if (!studentEmailsToSent.has(studentId)) {
        studentEmailsToSent.set(studentId, {
          email: studentProfile.email,
          name: studentProfile.display_name || 'Schüler',
          topics: [],
          responseIds: []
        });
      }

      const entry = studentEmailsToSent.get(studentId)!;
      entry.topics.push(topic);
      entry.responseIds.push(response.id);
    }

    // Send emails to students
    const sentResponseIds: string[] = [];
    for (const [_, entry] of studentEmailsToSent.entries()) {
      await sendStudentFeedbackEmail(entry.email, entry.name, entry.topics);
      sentResponseIds.push(...entry.responseIds);
    }

    // Update emailed_at for sent responses
    if (sentResponseIds.length > 0) {
      await supabase
        .from('teacher_responses')
        .update({ emailed_at: new Date().toISOString() })
        .in('id', sentResponseIds);
    }

    // 2. Process Un-emailed Student Requests (Student -> Teacher)
    // We group them by teacher_id so we send one summary per teacher
    
    // a) Password resets
    const { data: unsentPwResets, error: pwErr } = await supabase
      .from('password_reset_requests')
      .select(`
        id,
        student_id,
        profiles!password_reset_requests_student_id_fkey (
          id,
          display_name,
          assigned_teacher_id
        )
      `)
      .is('emailed_at', null)
      .eq('status', 'pending');

    if (pwErr) throw pwErr;

    // b) Pronunciation requests
    const { data: unsentPronun, error: prErr } = await supabase
      .from('pronunciation_requests')
      .select(`
        id,
        teacher_id,
        hanzi,
        profiles!pronunciation_requests_student_id_fkey (
          display_name
        )
      `)
      .is('emailed_at', null)
      .eq('status', 'pending');

    if (prErr) throw prErr;

    // Build teacher summary maps
    // teacher_id -> summary data
    const teacherSummaries = new Map<string, { 
      studentNames: string[], 
      topics: string[], 
      pwResetIds: string[], 
      pronunIds: string[] 
    }>();

    for (const reset of unsentPwResets || []) {
      const studentProfile = Array.isArray(reset.profiles) ? reset.profiles[0] : reset.profiles;
      const teacherId = studentProfile?.assigned_teacher_id;
      if (!teacherId) continue;

      if (!teacherSummaries.has(teacherId)) {
        teacherSummaries.set(teacherId, { studentNames: [], topics: [], pwResetIds: [], pronunIds: [] });
      }

      const entry = teacherSummaries.get(teacherId)!;
      entry.studentNames.push(studentProfile?.display_name || 'Unbekannt');
      entry.topics.push('Passwort-Reset');
      entry.pwResetIds.push(reset.id);
    }

    for (const req of unsentPronun || []) {
      const teacherId = req.teacher_id;
      if (!teacherId) continue;

      const studentProfile = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;

      if (!teacherSummaries.has(teacherId)) {
        teacherSummaries.set(teacherId, { studentNames: [], topics: [], pwResetIds: [], pronunIds: [] });
      }

      const entry = teacherSummaries.get(teacherId)!;
      entry.studentNames.push(studentProfile?.display_name || 'Unbekannt');
      entry.topics.push(`Aussprache-Überprüfung (${req.hanzi})`);
      entry.pronunIds.push(req.id);
    }

    // Now fetch teacher emails and send summaries
    const sentPwResetIds: string[] = [];
    const sentPronunIds: string[] = [];

    for (const [teacherId, summary] of teacherSummaries.entries()) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', teacherId)
        .single();
      
      if (teacherProfile && teacherProfile.email) {
        const totalRequests = summary.pwResetIds.length + summary.pronunIds.length;
        await sendTeacherSummaryEmail(teacherProfile.email, {
          studentNames: summary.studentNames,
          topics: summary.topics,
          requestCount: totalRequests
        });
        sentPwResetIds.push(...summary.pwResetIds);
        sentPronunIds.push(...summary.pronunIds);
      }
    }

    // Update emailed_at
    const nowISO = new Date().toISOString();
    if (sentPwResetIds.length > 0) {
      await supabase.from('password_reset_requests').update({ emailed_at: nowISO }).in('id', sentPwResetIds);
    }
    if (sentPronunIds.length > 0) {
      await supabase.from('pronunciation_requests').update({ emailed_at: nowISO }).in('id', sentPronunIds);
    }

    return NextResponse.json({
      success: true,
      stats: {
        studentEmailsSent: studentEmailsToSent.size,
        teacherEmailsSent: teacherSummaries.size,
      }
    });

  } catch (error: any) {
    console.error('Hourly Email Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
