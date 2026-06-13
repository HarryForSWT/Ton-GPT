import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-center items-center p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-4">
          Ton-GPT
        </h1>
        <p className="text-xl text-neutral-400">Master Mandarin Pronunciation.</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <Link
          href="/auth/login"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-center font-bold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/20"
        >
          Sign In
        </Link>
        <div className="flex gap-4">
          <Link
            href="/student/vocab"
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-center font-medium py-3 rounded-2xl transition-colors"
          >
            Student Mode
          </Link>
          <Link
            href="/teacher"
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-center font-medium py-3 rounded-2xl transition-colors"
          >
            Teacher Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
