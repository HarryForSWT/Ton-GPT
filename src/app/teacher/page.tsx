"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Clock, CheckCircle2, Mic, Bell } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { de } from "@/locales/de";
import { getAllRequests, PronunciationRequest, RequestStatus } from "@/lib/requests";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

type Filter = "all" | RequestStatus;

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `vor ${days} Tag${days > 1 ? "en" : ""}`;
  if (hours > 0) return `vor ${hours} Std.`;
  if (mins > 0) return `vor ${mins} Min.`;
  return "gerade eben";
}

export default function TeacherDashboard() {
  const t = de.teacherDashboard;

  const [requests, setRequests] = useState<PronunciationRequest[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const cookies = document.cookie.split("; ");
      const readCookie = cookies.find(row => row.startsWith("read_teacher_requests="));
      const ids = readCookie ? readCookie.split("=")[1].split(",").filter(Boolean) : [];
      setReadIds(ids);
    } catch (e) {
      console.error(e);
    }

    getAllRequests()
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  // Anzahl ungelesener (ungeöffneter) pending Anfragen berechnen
  const unreadPendingCount = requests.filter(
    (r) => r.status === "pending" && !readIds.includes(r.id)
  ).length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Dekorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Header */}
        <header className="mb-8 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-neutral-400 mt-1 text-sm">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            {/* Glocke für ungelesene eingegangene Anfragen */}
            {unreadPendingCount > 0 && (
              <div
                className="relative p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center animate-pulse"
                title={`${unreadPendingCount} neue unbeantwortete Anfrage(n) von Schülern!`}
              >
                <Bell size={18} className="fill-current animate-bounce duration-1000" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-neutral-950">
                  {unreadPendingCount}
                </span>
              </div>
            )}

            <form action={logout}>
              <button
                type="submit"
                className="text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 px-4 py-2.5 rounded-xl transition-all active:scale-95 text-neutral-300 hover:text-white cursor-pointer"
              >
                {t.logout}
              </button>
            </form>
          </div>
        </header>

        {/* Stats-Leiste */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-white">{requests.length}</p>
              <p className="text-xs text-neutral-500 mt-1">{t.allRequests}</p>
            </div>
            <div className="bg-neutral-900 border border-amber-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-amber-400">{pendingCount}</p>
              <p className="text-xs text-neutral-500 mt-1">{t.pendingRequests}</p>
            </div>
            <div className="bg-neutral-900 border border-emerald-500/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-400">{requests.length - pendingCount}</p>
              <p className="text-xs text-neutral-500 mt-1">{t.reviewedRequests}</p>
            </div>
          </div>
        )}

        {/* Filter-Tabs */}
        <div className="flex gap-2 mb-5">
          {(["all", "pending", "reviewed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {f === "all" ? t.filterAll : f === "pending" ? t.filterPending : t.filterReviewed}
              {f === "pending" && pendingCount > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  filter === "pending" ? "bg-white/20" : "bg-amber-500/20 text-amber-400"
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Laden */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Leer-Zustand */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-5">
              <Mic size={32} className="text-neutral-600" />
            </div>
            <p className="text-neutral-400 text-sm">
              {filter === "pending" ? t.emptyStatePending : t.emptyState}
            </p>
          </div>
        )}

        {/* Anfragen-Liste */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((req) => {
              const isUnreadPending = req.status === "pending" && !readIds.includes(req.id);
              return (
                <Link
                  key={req.id}
                  href={`/teacher/request/${req.id}`}
                  className="block"
                >
                  <div className={`p-4 rounded-2xl transition-all duration-200 group border relative ${
                    isUnreadPending
                      ? "bg-blue-500/5 border-blue-500 hover:bg-blue-500/10 shadow-lg shadow-blue-500/5"
                      : req.status === "pending"
                        ? "bg-neutral-900 border-amber-500/20 hover:border-blue-500/50"
                        : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}>
                    {/* Pulsierender blauer Punkt für ungelesene Anfragen */}
                    {isUnreadPending && (
                      <span className="absolute -top-1.5 -left-1.5 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-4">

                      {/* Linke Seite */}
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          req.status === "pending"
                            ? "bg-amber-500/10 border border-amber-500/20"
                            : "bg-neutral-800"
                        }`}>
                          <span className="text-xl font-bold text-white">{req.hanzi.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-white truncate">{req.hanzi}</p>
                          {req.pinyin && (
                            <p className="text-blue-400 text-sm font-mono truncate">{req.pinyin}</p>
                          )}
                          <p className="text-neutral-500 text-xs truncate">
                            {req.profiles?.display_name || req.profiles?.email || "Schüler"}
                            {" · "}{timeAgo(req.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Rechte Seite */}
                      <div className="flex items-center gap-3 shrink-0">
                        {req.status === "reviewed" ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-xs font-bold">
                            <CheckCircle2 size={11} />
                            {t.statusReviewed}
                          </span>
                        ) : (
                          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isUnreadPending
                              ? "bg-blue-500 text-white animate-pulse"
                              : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                          }`}>
                            <Clock size={11} />
                            {isUnreadPending ? "Neu" : t.statusPending}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-neutral-700 group-hover:text-neutral-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
