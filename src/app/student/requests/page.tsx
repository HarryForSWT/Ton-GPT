"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, ChevronRight, Clock, CheckCircle2, Mic } from "lucide-react";
import { de } from "@/locales/de";
import { getMyRequests, PronunciationRequest } from "@/lib/requests";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

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

export default function MyRequestsPage() {
  const t = de.requests;

  const [requests, setRequests] = useState<PronunciationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyRequests()
      .then(setRequests)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Dekorative Glows */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-neutral-500 text-sm mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <Link
              href="/student/requests/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus size={16} />
              Neu
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Leer-Zustand */}
        {!loading && !error && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-5">
              <Mic size={32} className="text-neutral-600" />
            </div>
            <p className="text-neutral-400 mb-6 max-w-xs">{t.emptyState}</p>
            <Link
              href="/student/requests/new"
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
            >
              <Plus size={18} />
              {t.emptyStateBtn}
            </Link>
          </div>
        )}

        {/* Anfragen-Liste */}
        {!loading && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map((req) => (
              <Link
                key={req.id}
                href={`/student/requests/${req.id}`}
                className="block"
              >
                <div className="p-4 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-2xl transition-all duration-200 group">
                  <div className="flex items-center justify-between gap-4">

                    {/* Linke Seite: Wort */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-white">{req.hanzi.charAt(0)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-white truncate">{req.hanzi}</p>
                        {req.pinyin && (
                          <p className="text-emerald-400 text-sm font-mono truncate">{req.pinyin}</p>
                        )}
                        {req.german_meaning && (
                          <p className="text-neutral-500 text-xs truncate">{req.german_meaning}</p>
                        )}
                      </div>
                    </div>

                    {/* Rechte Seite: Status + Zeit */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {req.status === "reviewed" ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-xs font-bold">
                          <CheckCircle2 size={12} />
                          {t.statusReviewed}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full text-xs font-bold">
                          <Clock size={12} />
                          {t.statusPending}
                        </span>
                      )}
                      <span className="text-xs text-neutral-600">{timeAgo(req.created_at)}</span>
                    </div>

                    <ChevronRight size={16} className="text-neutral-700 group-hover:text-neutral-400 transition-colors shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
