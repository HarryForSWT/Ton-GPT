"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Trophy, PlusCircle, CheckCircle, Award } from "lucide-react";
import { de } from "@/locales/de";
import { getCalendarActivities, getStreakCount, getVocabList, Vocabulary, DailyActivity } from "@/lib/db";

export default function CalendarPage() {
  const t = de.calendar;

  const [activities, setActivities] = useState<Record<string, DailyActivity>>({});
  const [streak, setStreak] = useState(0);
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Heute als Vorauswahl für die Detailansicht
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  useEffect(() => {
    async function loadData() {
      try {
        const acts = await getCalendarActivities();
        const strk = await getStreakCount();
        const vocabs = await getVocabList();
        
        setActivities(acts);
        setStreak(strk);
        setVocabList(vocabs);
      } catch (err) {
        console.error("Fehler beim Laden der Kalenderdaten:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalVocab = vocabList.length;
  const learnedVocab = vocabList.filter((v) => v.learned).length;
  const learnedPercent = totalVocab > 0 ? Math.round((learnedVocab / totalVocab) * 100) : 0;

  // Kalender-Berechnung
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  let firstDayIndex = firstDayOfMonth.getDay(); // 0 = So, 1 = Mo...
  // Umstellen auf Mo = 0, Di = 1 ... So = 6
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Navigation
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const getDayDateStr = (dayNum: number) => {
    const mStr = (month + 1).toString().padStart(2, "0");
    const dStr = dayNum.toString().padStart(2, "0");
    return `${year}-${mStr}-${dStr}`;
  };

  // Aktivität im aktuellen Monat zählen
  const addedThisMonth = vocabList.filter((v) => {
    if (!v.createdAt) return false;
    const d = new Date(v.createdAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Lade Lernkalender...</p>
        </div>
      </div>
    );
  }

  // Details der ausgewählten Vokabeln für den Detailbereich
  const selectedDayActivity = activities[selectedDateStr] || { added: [], learned: [], practiced: [] };
  const hasActivityOnSelectedDay =
    selectedDayActivity.added.length > 0 ||
    selectedDayActivity.learned.length > 0 ||
    selectedDayActivity.practiced.length > 0;

  const formattedSelectedDate = () => {
    try {
      const parts = selectedDateStr.split("-");
      if (parts.length !== 3) return selectedDateStr;
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    } catch {
      return selectedDateStr;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Glow effects for modern UI */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-2 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-neutral-400 text-sm mt-0.5">{t.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Dashboard / Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Streak */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition-all" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.streakTitle}</span>
              <Flame className={`w-5 h-5 ${streak > 0 ? "text-amber-500 fill-amber-500 animate-pulse" : "text-neutral-600"}`} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-white">
                {streak > 0 ? t.streakActive.replace("{streak}", streak.toString()) : t.streakInactive}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1 leading-tight">{t.streakCaption}</p>
            </div>
          </div>

          {/* Gelernt-Quote */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-all" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.statsLearnedRate}</span>
              <Trophy className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-400">{learnedPercent}%</p>
              <p className="text-[10px] text-neutral-500 mt-1">
                {learnedVocab} von {totalVocab} gelernt
              </p>
            </div>
          </div>

          {/* Gesamt Vokabeln */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t.statsTotalVocab}</span>
            <div>
              <p className="text-3xl font-extrabold text-white">{totalVocab}</p>
              <p className="text-[10px] text-neutral-500 mt-1">Wörter im Offline-Speicher</p>
            </div>
          </div>

          {/* Diesen Monat neu */}
          <div className="bg-neutral-900 border border-neutral-800/80 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t.statsAddedThisMonth}</span>
            <div>
              <p className="text-3xl font-extrabold text-teal-400">{addedThisMonth}</p>
              <p className="text-[10px] text-neutral-500 mt-1">
                im {t.monthNames[month]} {year}
              </p>
            </div>
          </div>

        </div>

        {/* Kalender Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative">
          
          {/* Kalender Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">
              {t.monthNames[month]} {year}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={prevMonth}
                className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-all active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Wochentage */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            {t.dayNamesShort.map((day) => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Kalender Gitter */}
          <div className="grid grid-cols-7 gap-1">
            
            {/* Leere Zellen am Monatsanfang */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-transparent" />
            ))}

            {/* Tage des Monats */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateKey = getDayDateStr(dayNum);
              const dayAct = activities[dateKey];
              const isSelected = dateKey === selectedDateStr;
              const isToday = dateKey === todayStr;

              // Hat an diesem Tag Aktivität stattgefunden?
              const hasAdded = dayAct && dayAct.added.length > 0;
              const hasLearned = dayAct && dayAct.learned.length > 0;
              const hasPracticed = dayAct && dayAct.practiced.length > 0;

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDateStr(dateKey)}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all outline-none ${
                    isSelected
                      ? "bg-teal-500 text-neutral-950 font-bold scale-100 shadow-lg shadow-teal-500/20"
                      : isToday
                        ? "bg-neutral-800 text-white font-bold border-2 border-teal-500/60"
                        : "bg-neutral-950/60 hover:bg-neutral-800 text-neutral-300"
                  }`}
                >
                  {/* Tag-Nummer */}
                  <span className="text-sm font-semibold">{dayNum}</span>

                  {/* Aktivitäts-Punkte */}
                  <div className="flex gap-0.5 justify-center mt-auto pb-0.5">
                    {hasAdded && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-neutral-950" : "bg-blue-400"}`} title={t.markerAdded} />
                    )}
                    {hasLearned && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-neutral-950" : "bg-emerald-400"}`} title={t.markerLearned} />
                    )}
                    {hasPracticed && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-neutral-950" : "bg-amber-500"}`} title={t.markerPracticed} />
                    )}
                  </div>
                </button>
              );
            })}

          </div>

          {/* Legende */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-5 border-t border-neutral-800/80 text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>{t.markerAdded}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t.markerLearned}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{t.markerPracticed}</span>
            </div>
          </div>

        </div>

        {/* Detailbereich für ausgewählten Tag */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">
            {t.activityForDay.replace("{day}", formattedSelectedDate())}
          </h2>

          {!hasActivityOnSelectedDay ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              {t.noActivity}
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Hinzugefügte Vokabeln */}
              {selectedDayActivity.added.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <PlusCircle size={14} />
                    {t.addedWords} ({selectedDayActivity.added.length})
                  </h3>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {selectedDayActivity.added.map((v) => (
                      <Link key={v.id} href={`/student/vocab/${v.id}`} className="block">
                        <div className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-850 hover:border-blue-500/30 rounded-xl transition-all">
                          <p className="text-lg font-bold text-white leading-tight">{v.hanzi}</p>
                          <p className="text-xs text-blue-400 font-mono mt-0.5 truncate">{v.pinyin}</p>
                          <p className="text-xs text-neutral-400 mt-1 truncate">{v.germanMeaning}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Gelernte Vokabeln */}
              {selectedDayActivity.learned.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    {t.learnedWords} ({selectedDayActivity.learned.length})
                  </h3>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {selectedDayActivity.learned.map((v) => (
                      <Link key={v.id} href={`/student/vocab/${v.id}`} className="block">
                        <div className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-850 hover:border-emerald-500/30 rounded-xl transition-all">
                          <p className="text-lg font-bold text-white leading-tight">{v.hanzi}</p>
                          <p className="text-xs text-emerald-400 font-mono mt-0.5 truncate">{v.pinyin}</p>
                          <p className="text-xs text-neutral-400 mt-1 truncate">{v.germanMeaning}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Geübte Vokabeln */}
              {selectedDayActivity.practiced.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Award size={14} />
                    {t.practicedWords} ({selectedDayActivity.practiced.length})
                  </h3>
                  <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                    {selectedDayActivity.practiced.map((v) => (
                      <Link key={v.id} href={`/student/vocab/${v.id}`} className="block">
                        <div className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-850 hover:border-amber-500/30 rounded-xl transition-all">
                          <p className="text-lg font-bold text-white leading-tight">{v.hanzi}</p>
                          <p className="text-xs text-amber-400 font-mono mt-0.5 truncate">{v.pinyin}</p>
                          <p className="text-xs text-neutral-400 mt-1 truncate">{v.germanMeaning}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
