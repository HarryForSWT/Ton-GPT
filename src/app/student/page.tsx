import Link from "next/link";
import { logout } from "../auth/actions";
import { de } from "@/locales/de";

export default function StudentDashboard() {
  const t = de.studentDashboard;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 relative overflow-hidden">
      {/* Background gradients for premium aesthetic */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="mb-8 flex justify-between items-start relative z-10">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">{t.welcome}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 px-4 py-2.5 rounded-xl transition-all active:scale-95 text-neutral-300 hover:text-white"
          >
            {t.logout}
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        <Link
          href="/student/vocab"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-emerald-500/60 hover:bg-neutral-850/30 transition-all group duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-emerald-400 transition-colors">
            {t.vocabListTitle}
          </h2>
          <p className="text-neutral-400 text-sm">{t.vocabListDesc}</p>
        </Link>

        <Link
          href="/student/requests"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-blue-500/60 hover:bg-neutral-850/30 transition-all group duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">
            {t.requestsTitle}
          </h2>
          <p className="text-neutral-400 text-sm">{t.requestsDesc}</p>
        </Link>

        <Link
          href="/student/calendar"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-teal-500/60 hover:bg-neutral-850/30 transition-all group duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-teal-400 transition-colors">
            {t.calendarTitle}
          </h2>
          <p className="text-neutral-400 text-sm">{t.calendarDesc}</p>
        </Link>
      </div>
    </div>
  );
}

