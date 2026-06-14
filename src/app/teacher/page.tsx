"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Clock, CheckCircle2, Mic, Bell, Users, Settings, KeyRound, UserPlus } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { de } from "@/locales/de";
import { getAllRequests, PronunciationRequest, RequestStatus } from "@/lib/requests";
import { getAllStudents, getAllTeachers, assignStudent, getPendingPasswordResets, resolvePasswordReset, StudentProfile, PasswordResetRequest } from "@/lib/admin";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

type Filter = "all" | RequestStatus;
type DashboardTab = "requests" | "students" | "management";

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
  const ta = de.admin;

  // ─── State: Anfragen ─────────────────────────────────────────────────────
  const [requests, setRequests] = useState<PronunciationRequest[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  // ─── State: Dashboard Tab ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DashboardTab>("requests");

  // ─── State: Schüler-Verwaltung ───────────────────────────────────────────
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [teachers, setTeachers] = useState<StudentProfile[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // ─── State: Passwort-Anfragen ────────────────────────────────────────────
  const [pwResets, setPwResets] = useState<PasswordResetRequest[]>([]);
  const [pwResetsLoading, setPwResetsLoading] = useState(false);
  const [pwResetsLoaded, setPwResetsLoaded] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // ─── State: Lehrer registrieren ──────────────────────────────────────────
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [newTeacherPassword, setNewTeacherPassword] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState("");

  // ─── Anfragen laden ──────────────────────────────────────────────────────
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

    // Passwort-Anfragen direkt beim Mounten laden
    setPwResetsLoading(true);
    getPendingPasswordResets()
      .then((data) => {
        setPwResets(data);
        setPwResetsLoaded(true);
      })
      .catch(console.error)
      .finally(() => setPwResetsLoading(false));
  }, []);

  // ─── Schüler/Lehrer laden wenn Tab wechselt ─────────────────────────────
  useEffect(() => {
    if (activeTab === "students" && students.length === 0 && !studentsLoading) {
      setStudentsLoading(true);
      Promise.all([getAllStudents(), getAllTeachers()])
        .then(([s, t]) => { setStudents(s); setTeachers(t); })
        .catch((err) => setStudentsError(err.message))
        .finally(() => setStudentsLoading(false));
    }
  }, [activeTab, students.length, studentsLoading]);

  // ─── Passwort-Anfragen laden wenn Tab wechselt ─────────────────────────
  useEffect(() => {
    if (activeTab === "management" && !pwResetsLoaded && !pwResetsLoading) {
      setPwResetsLoading(true);
      getPendingPasswordResets()
        .then((data) => {
          setPwResets(data);
          setPwResetsLoaded(true);
        })
        .catch(console.error)
        .finally(() => setPwResetsLoading(false));
    }
  }, [activeTab, pwResetsLoaded, pwResetsLoading]);

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const unreadPendingCount = requests.filter(
    (r) => r.status === "pending" && !readIds.includes(r.id)
  ).length;

  // ─── Handler ─────────────────────────────────────────────────────────────

  async function handleAssign(studentId: string, teacherId: string | null) {
    setAssigningId(studentId);
    try {
      await assignStudent(studentId, teacherId);
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, assigned_teacher_id: teacherId, assigned_teacher: teacherId ? teachers.find(t => t.id === teacherId) ? { display_name: teachers.find(t => t.id === teacherId)!.display_name, email: teachers.find(t => t.id === teacherId)!.email } : null : null }
          : s
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setAssigningId(null);
    }
  }

  async function handlePasswordReset(studentId: string, requestId: string) {
    if (!confirm(ta.resetConfirm)) return;
    setResettingId(requestId);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      await resolvePasswordReset(requestId);
      setPwResets(prev => prev.filter(r => r.id !== requestId));
      alert(ta.resetSuccess);
    } catch (err) {
      console.error(err);
      alert('Fehler: ' + (err instanceof Error ? err.message : 'Unbekannt'));
    } finally {
      setResettingId(null);
    }
  }

  async function handleRegisterTeacher(e: React.FormEvent) {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterMessage("");
    try {
      const res = await fetch('/api/admin/register-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newTeacherEmail,
          password: newTeacherPassword,
          display_name: newTeacherName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setRegisterMessage(ta.registerSuccess);
      setNewTeacherEmail("");
      setNewTeacherName("");
      setNewTeacherPassword("");
      // Lehrer-Liste neu laden
      getAllTeachers().then(setTeachers).catch(console.error);
    } catch (err) {
      setRegisterMessage(ta.registerError + (err instanceof Error ? ': ' + err.message : ''));
    } finally {
      setRegisterLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Dekorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10">

        {/* Header */}
        <header className="mb-6 flex justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              {t.title}
            </h1>
            <p className="text-neutral-400 mt-1 text-sm">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            {/* Glocke für ungelesene eingegangene Anfragen */}
            {(unreadPendingCount > 0 || pwResets.length > 0) && (
              <div
                className="relative p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center animate-pulse cursor-pointer"
                title={`${unreadPendingCount} neue Anfrage(n), ${pwResets.length} Passwort-Anfrage(n)`}
                onClick={() => unreadPendingCount > 0 ? setActiveTab("requests") : setActiveTab("management")}
              >
                <Bell size={18} className="fill-current animate-bounce duration-1000" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-neutral-950">
                  {unreadPendingCount + pwResets.length}
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

        {/* ─── Dashboard-Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-2 mb-5 border-b border-neutral-800 pb-3">
          {([
            { key: "requests" as DashboardTab, label: t.tabRequests, icon: <Mic size={14} /> },
            { key: "students" as DashboardTab, label: ta.studentsTab, icon: <Users size={14} /> },
            { key: "management" as DashboardTab, label: ta.managementTab, icon: <Settings size={14} />, badge: pwResets.length },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge && tab.badge > 0 ? (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? "bg-white/20" : "bg-red-500/20 text-red-400"
                }`}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: Anfragen                                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "requests" && (
          <>
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
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: Schüler-Verwaltung                                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "students" && (
          <div>
            <h2 className="text-xl font-bold mb-4">{ta.studentListTitle}</h2>

            {studentsLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            )}

            {studentsError && (
              <div className="p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm">
                {studentsError}
              </div>
            )}

            {!studentsLoading && !studentsError && students.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
                  <Users size={28} className="text-neutral-600" />
                </div>
                <p className="text-neutral-400 text-sm">{ta.noStudents}</p>
              </div>
            )}

            {!studentsLoading && students.length > 0 && (
              <div className="space-y-3">
                {students.map((student) => {
                  const currentTeacher = student.assigned_teacher_id
                    ? teachers.find(tc => tc.id === student.assigned_teacher_id)
                    : null;
                  const teacherName = currentTeacher?.display_name || student.assigned_teacher?.display_name || null;

                  return (
                    <div key={student.id} className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">{student.display_name}</p>
                          <p className="text-neutral-500 text-xs truncate">{student.email}</p>
                          <p className="text-neutral-600 text-xs mt-1">
                            {ta.currentTeacher}: {' '}
                            <span className={teacherName ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                              {teacherName || ta.noTeacher}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            className="bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors cursor-pointer"
                            value={student.assigned_teacher_id || ""}
                            onChange={(e) => handleAssign(student.id, e.target.value || null)}
                            disabled={assigningId === student.id}
                          >
                            <option value="">— {ta.noTeacher} —</option>
                            {teachers.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.display_name}
                              </option>
                            ))}
                          </select>
                          {assigningId === student.id && (
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB: Verwaltung                                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === "management" && (
          <div className="space-y-8">

            {/* ── Passwort-Anfragen ─────────────────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <KeyRound size={18} className="text-amber-400" />
                {ta.passwordRequests}
                {pwResets.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                    {pwResets.length}
                  </span>
                )}
              </h2>

              {pwResetsLoading && (
                <div className="h-20 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
              )}

              {!pwResetsLoading && pwResets.length === 0 && (
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-neutral-400 text-sm text-center">
                  {ta.noPasswordRequests}
                </div>
              )}

              {!pwResetsLoading && pwResets.length > 0 && (
                <div className="space-y-3">
                  {pwResets.map((req) => (
                    <div key={req.id} className="p-4 bg-neutral-900 border border-amber-500/20 rounded-2xl">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-white font-bold truncate">
                            {req.profiles?.display_name || "Schüler"}
                          </p>
                          <p className="text-neutral-500 text-xs truncate">{req.profiles?.email}</p>
                          <p className="text-neutral-600 text-xs mt-1">
                            {ta.requestedAt} {new Date(req.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePasswordReset(req.student_id, req.id)}
                          disabled={resettingId === req.id}
                          className="shrink-0 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {resettingId === req.id ? ta.saving : ta.resetToDefault}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Neuen Lehrer registrieren ─────────────────────────────── */}
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserPlus size={18} className="text-indigo-400" />
                {ta.registerTeacher}
              </h2>
              <p className="text-neutral-500 text-sm mb-4">{ta.registerTeacherDesc}</p>

              <form onSubmit={handleRegisterTeacher} className="space-y-4 p-5 bg-neutral-900 border border-neutral-800 rounded-2xl">
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">{de.auth.displayNameLabel}</label>
                  <input
                    type="text"
                    value={newTeacherName}
                    onChange={(e) => setNewTeacherName(e.target.value)}
                    required
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder={de.auth.displayNamePlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">{de.auth.emailLabel}</label>
                  <input
                    type="email"
                    value={newTeacherEmail}
                    onChange={(e) => setNewTeacherEmail(e.target.value)}
                    required
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder={de.auth.emailPlaceholder}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-1">{de.auth.passwordLabel}</label>
                  <input
                    type="password"
                    value={newTeacherPassword}
                    onChange={(e) => setNewTeacherPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white focus:border-indigo-500 focus:outline-none transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {registerMessage && (
                  <div className={`p-3 rounded-xl text-center text-sm ${
                    registerMessage.includes('erfolgreich')
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {registerMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registerLoading ? ta.saving : ta.registerBtn}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
