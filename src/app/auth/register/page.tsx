import Link from "next/link";
import { register } from "../actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { de } from "@/locales/de";

export default async function Register(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const t = de.auth;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-2">{t.registerTitle}</h1>
        <p className="text-neutral-400 text-center mb-8">{t.registerSubtitle}</p>

        {searchParams?.error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-xl text-center text-sm">
                {searchParams.error}
            </div>
        )}

        <form className="space-y-4" action={register}>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">{t.displayNameLabel}</label>
            <input
              type="text"
              name="display_name"
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder={t.displayNamePlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">{t.emailLabel}</label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder={t.emailPlaceholder}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">{t.passwordLabel}</label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-neutral-400 mt-2">
              <input
                type="checkbox"
                name="wants_email_notifications"
                value="true"
                defaultChecked
                className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900"
              />
              Ich möchte E-Mail-Benachrichtigungen erhalten
            </label>
            <p className="text-[10px] text-neutral-500 mt-1 pl-6">
              Wenn du eine ausgedachte E-Mail-Adresse verwendest, deaktiviere diese Option.
            </p>
          </div>
          {/* Rolle ist fest auf "student" gesetzt — Lehrer werden nur vom Admin erstellt */}
          <input type="hidden" name="role" value="student" />
          <SubmitButton className="w-full mt-4 !p-3 !rounded-xl">
            {t.signUpBtn}
          </SubmitButton>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/auth/login" className="text-emerald-400 hover:underline">{t.hasAccountLink}</Link>
        </div>
      </div>
    </div>
  );
}
