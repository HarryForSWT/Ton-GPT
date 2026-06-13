import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "./auth/actions";

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = null;
  if (user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      role = profile?.role;
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-4">
          Ton-GPT
        </h1>
        <p className="text-xl text-neutral-400">Master Mandarin Pronunciation.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {user ? (
          <div className="w-full flex flex-col gap-4">
            <Link
                href={role === 'teacher' ? '/teacher' : '/student'}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
            >
                Go to Dashboard
            </Link>
            <form action={logout}>
                <button type="submit" className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 rounded-2xl transition-colors">
                    Logout
                </button>
            </form>
          </div>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="bg-neutral-800 hover:bg-neutral-700 text-white text-center font-medium py-3 rounded-2xl transition-colors"
            >
              Create Account
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
