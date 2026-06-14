import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'Ton-GPT <onboarding@resend.dev>'; // Default from Resend for testing

export async function sendTeacherSummaryEmail(
  teacherEmail: string,
  summary: {
    studentNames: string[];
    topics: string[];
    requestCount: number;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Skipping email to teacher:', teacherEmail);
    return;
  }

  const { studentNames, topics, requestCount } = summary;
  
  // Deduplicate and format
  const uniqueStudents = Array.from(new Set(studentNames)).join(', ');
  const uniqueTopics = Array.from(new Set(topics)).join(', ');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #10b981;">Neue Anfragen auf Ton-GPT</h2>
      <p>Hallo,</p>
      <p>Es gibt <strong>${requestCount}</strong> neue Anfragen von deinen Schülern.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Von:</strong> ${uniqueStudents}</p>
        <p style="margin: 0;"><strong>Themen:</strong> ${uniqueTopics}</p>
      </div>
      <p>Melde dich in der Ton-GPT App an, um die Anfragen zu bearbeiten.</p>
      <br/>
      <p style="font-size: 12px; color: #6b7280;">Diese E-Mail wurde automatisch generiert.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [teacherEmail],
      subject: `Ton-GPT: ${requestCount} neue Schüler-Anfrage(n)`,
      html,
    });

    if (error) {
      console.error('Resend error (Teacher Summary):', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to send teacher summary email:', error);
    throw error;
  }
}

export async function sendStudentFeedbackEmail(
  studentEmail: string,
  studentName: string,
  topics: string[]
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set. Skipping email to student:', studentEmail);
    return;
  }

  const uniqueTopics = Array.from(new Set(topics)).join(', ');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #8b5cf6;">Dein Lehrer hat geantwortet!</h2>
      <p>Hallo ${studentName},</p>
      <p>Dein Lehrer hat dir auf Ton-GPT neues Feedback hinterlassen.</p>
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Themen:</strong> ${uniqueTopics}</p>
      </div>
      <p>Melde dich an, um dir das Feedback (z. B. die Audioaufnahme) anzuhören!</p>
      <br/>
      <p style="font-size: 12px; color: #6b7280;">Du erhältst diese E-Mail, weil du Benachrichtigungen aktiviert hast.</p>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [studentEmail],
      subject: `Ton-GPT: Neues Feedback von deinem Lehrer!`,
      html,
    });

    if (error) {
      console.error('Resend error (Student Feedback):', error);
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Failed to send student feedback email:', error);
    throw error;
  }
}
