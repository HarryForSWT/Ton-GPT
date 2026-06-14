import Link from "next/link";
import { register } from "../actions";
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
          {/* Rolle ist fest auf "student" gesetzt — Lehrer werden nur vom Admin erstellt */}
          <input type="hidden" name="role" value="student" />
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-3 rounded-xl transition-colors mt-4"
          >
            {t.signUpBtn}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/auth/login" className="text-emerald-400 hover:underline">{t.hasAccountLink}</Link>
        </div>
      </div>
    </div>
  );
}
