import Link from "next/link";
import { logout } from "../auth/actions";
import { de } from "@/locales/de";
import { createClient } from "@/utils/supabase/server";
import { Bell, Volume2 } from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { cookies } from "next/headers";

export default async function StudentDashboard() {
  const t = de.studentDashboard;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let displayName = "";
  let unreadCount = 0;

  if (user) {
    // 1. Displayname abfragen
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    displayName = profile?.display_name || user.email?.split('@')[0] || "";

    // 2. Ungelesene reviewed Anfragen zählen (Gelesene IDs aus Cookie herausfiltern)
    const { data: reviewedRequests, error } = await supabase
      .from('pronunciation_requests')
      .select('id')
      .eq('student_id', user.id)
      .eq('status', 'reviewed');
    
    if (!error && reviewedRequests) {
      const cookieStore = await cookies();
      const readRequestsCookie = cookieStore.get("read_requests")?.value || "";
      const readIds = readRequestsCookie.split(",").filter(Boolean);
      
      const reviewedIds = reviewedRequests.map((r) => r.id);
      unreadCount = reviewedIds.filter((id) => !readIds.includes(id)).length;
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 relative overflow-hidden">
      {/* Background gradients for premium aesthetic */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="mb-8 flex justify-between items-start relative z-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-neutral-400 mt-2 text-sm">
            Willkommen auf deiner Lernreise, <span className="text-emerald-400 font-bold">{displayName}</span>!
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* Inbox Glocke */}
          {unreadCount > 0 && (
            <Link
              href="/student/requests"
              className="relative p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all flex items-center justify-center animate-pulse shadow-sm"
              title={`${unreadCount} neue Antwort(en) vom Lehrer!`}
            >
              <Bell size={18} className="fill-current animate-bounce duration-1000" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-neutral-950">
                {unreadCount}
              </span>
            </Link>
          )}

          {/* Logout */}
          <form action={logout}>
            <button
              type="submit"
              className="text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 px-4 py-2.5 rounded-xl transition-all active:scale-95 text-neutral-300 hover:text-white cursor-pointer shadow-sm"
            >
              {t.logout}
            </button>
          </form>
        </div>
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
          href="/student/practice/listening"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-amber-500/60 hover:bg-neutral-850/30 transition-all group duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
            <Volume2 size={20} className="text-amber-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
            Hören üben
          </h2>
          <p className="text-neutral-400 text-sm">Trainiere dein Hörverstehen und ordne Aussprachen dem Pinyin zu</p>
        </Link>

        <Link
          href="/student/requests"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-blue-500/60 hover:bg-neutral-850/30 transition-all group duration-300 relative"
        >
          {unreadCount > 0 && (
            <span className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 bg-red-500 text-white text-xs font-black rounded-full shadow-md shadow-red-500/10 border border-red-400">
              {unreadCount} neu
            </span>
          )}
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

        <Link
          href="/student/settings"
          className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-purple-500/60 hover:bg-neutral-850/30 transition-all group duration-300"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
            {t.settingsTitle}
          </h2>
          <p className="text-neutral-400 text-sm">{t.settingsDesc}</p>
        </Link>
      </div>
    </div>
  );
}
