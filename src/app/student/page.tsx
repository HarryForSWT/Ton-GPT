import Link from "next/link";

export default function StudentDashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          Student Dashboard
        </h1>
        <p className="text-neutral-400 mt-2">Welcome to your learning journey!</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/student/vocab"
          className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-emerald-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Vocabulary List</h2>
          <p className="text-neutral-400">View and practice your vocabulary</p>
        </Link>
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <h2 className="text-xl font-semibold mb-2">Learning Calendar</h2>
          <p className="text-neutral-400">Track your daily progress</p>
        </div>
      </div>
    </div>
  );
}
