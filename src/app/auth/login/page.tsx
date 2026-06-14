import Link from "next/link";
import { login } from "../actions";
import { de } from "@/locales/de";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default async function Login(props: { searchParams: Promise<{ message?: string, error?: string }> }) {
  const searchParams = await props.searchParams;
  const t = de.auth;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Ton-GPT</h1>
        <p className="text-neutral-400 text-center mb-8">{t.loginSubtitle}</p>

        {searchParams?.error && (
            <div className="mb-4 p-3 bg-red-500/20 text-red-400 rounded-xl text-center text-sm">
                {searchParams.error}
            </div>
        )}
        {searchParams?.message && (
            <div className="mb-4 p-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-center text-sm">
                {searchParams.message}
            </div>
        )}

        <form className="space-y-4" action={login}>
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
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-neutral-400">{t.passwordLabel}</label>
              <Link href="/auth/reset-password" className="text-xs text-emerald-400 hover:underline">{t.forgotLink}</Link>
            </div>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          <SubmitButton className="w-full mt-4 !p-3 !rounded-xl">
            {t.signInBtn}
          </SubmitButton>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/auth/register" className="text-emerald-400 hover:underline">{t.noAccountLink}</Link>
        </div>
      </div>
    </div>
  );
}
