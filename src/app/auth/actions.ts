'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/auth/login?error=Anmeldung fehlgeschlagen. Bitte überprüfe deine Zugangsdaten.')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'teacher') {
      redirect('/teacher')
    } else {
      redirect('/student')
    }
  } else {
      redirect('/')
  }
}

export async function register(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const display_name = formData.get('display_name') as string
  const role = formData.get('role') as string
  const wants_email_notifications = formData.get('wants_email_notifications') === 'true'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name,
        role,
        wants_email_notifications,
      }
    }
  })

  if (error) {
    redirect(`/auth/register?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/login?message=Konto erstellt! Bitte überprüfe deine E-Mails, um die Registrierung abzuschließen.')
}

export async function requestPasswordReset(formData: FormData) {
    const { createAdminClient } = await import('@/utils/supabase/admin')
    const supabase = createAdminClient()
    const email = formData.get('email') as string

    // Schüler-Profil anhand der E-Mail suchen
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

    if (profileError || !profile) {
        redirect('/auth/reset-password?error=Kein Konto mit dieser E-Mail-Adresse gefunden.')
    }

    // Passwort-Reset-Anfrage in der Datenbank erstellen
    const { error } = await supabase
        .from('password_reset_requests')
        .insert({
            student_id: profile.id,
            status: 'pending',
        })

    if (error) {
        redirect(`/auth/reset-password?error=${encodeURIComponent('Fehler beim Senden der Anfrage. Bitte versuche es erneut.')}`)
    }

    redirect('/auth/reset-password?message=Dein Lehrer wurde benachrichtigt. Bitte frage bei deinem Lehrer nach dem neuen Passwort.')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}
