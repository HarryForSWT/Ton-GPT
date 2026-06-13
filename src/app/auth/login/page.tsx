import Link from "next/link";

export default function Login() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Ton-GPT</h1>
        <p className="text-neutral-400 text-center mb-8">Sign in to your account</p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <input
              type="email"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold p-3 rounded-xl transition-colors mt-4"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>Demo accounts:</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/student" className="text-emerald-400 hover:underline">Student Demo</Link>
            <Link href="/teacher" className="text-blue-400 hover:underline">Teacher Demo</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
