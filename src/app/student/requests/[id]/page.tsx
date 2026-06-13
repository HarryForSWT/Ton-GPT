"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, MessageSquare, Mic2, Trash2 } from "lucide-react";
import { de } from "@/locales/de";
import {
  getRequestById,
  getResponseForRequest,
  getSignedAudioUrl,
  deletePronunciationRequest,
  PronunciationRequest,
  TeacherResponse,
} from "@/lib/requests";
import { AudioPlayer } from "@/components/audio/AudioPlayer";

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchBlob(url: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return null;
    }
    const blob = await res.blob();
    if (blob.type.includes("json") || blob.type.includes("html") || blob.type.includes("text")) {
      return null;
    }

    // Debug: read first 16 bytes to check signature
    try {
      const arrBuf = await blob.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(arrBuf);
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
      console.log('Fetched audio blob:', blob.size, 'bytes, type:', blob.type, 'First 16 bytes (Hex):', hex);
    } catch (e) {
      console.error('Failed to read blob slice:', e);
    }

    let finalMime = blob.type || "audio/webm";
    if (finalMime.includes("octet-stream") || finalMime.includes("x-www-form-urlencoded")) {
      finalMime = "audio/webm";
    }
    return { blob, mimeType: finalMime };
  } catch (err) {
    console.error('fetchBlob error:', err);
    return null;
  }
}

export default function RequestDetailPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const t = de.requests;

  const [request, setRequest] = useState<PronunciationRequest | null>(null);
  const [response, setResponse] = useState<TeacherResponse | null>(null);
  const [studentBlob, setStudentBlob] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [teacherBlob, setTeacherBlob] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRef, setSavingRef] = useState(false);
  const [refSavedMsg, setRefSavedMsg] = useState("");

  const handleSaveAsReference = async () => {
    if (!request || !teacherBlob) return;
    setSavingRef(true);
    try {
      const { getVocabList, addVocab, saveAudioRecording } = await import("@/lib/db");
      const list = await getVocabList();
      
      const matchedVocab = list.find(v => v.hanzi.trim() === request.hanzi.trim());
      let vocabId = matchedVocab?.id;

      if (!vocabId) {
        // Wort existiert lokal nicht, also neu anlegen
        vocabId = await addVocab({
          hanzi: request.hanzi.trim(),
          pinyin: request.pinyin.trim(),
          pinyinNumber: request.pinyin_number?.trim() || request.pinyin.trim(),
          germanMeaning: request.german_meaning?.trim() || "",
        });
      }

      // Audio speichern mit Rolle "teacher"
      await saveAudioRecording({
        vocabId,
        role: "teacher",
        blob: teacherBlob.blob,
        mimeType: teacherBlob.mimeType,
        durationMs: response?.audio_duration ? response.audio_duration * 1000 : 0,
      });

      // Audio speichern mit Rolle "student" (falls vorhanden)
      if (studentBlob) {
        await saveAudioRecording({
          vocabId,
          role: "student",
          blob: studentBlob.blob,
          mimeType: studentBlob.mimeType,
          durationMs: 0,
        });
      }

      // Nach lokalem Speichern: Cloud-Daten löschen (Local-First)
      await deletePronunciationRequest(request.id, request.student_audio_url, response?.audio_url || null);

      setRefSavedMsg(de.toneAnalyser.saveReferenceSuccess);
      setTimeout(() => {
        setRefSavedMsg("");
        router.push("/student/requests");
      }, 1500);
    } catch (err) {
      console.error("Fehler beim Speichern der Referenz:", err);
    } finally {
      setSavingRef(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!request) return;
    if (confirm("Möchtest du diese Anfrage wirklich endgültig löschen?")) {
      setSavingRef(true);
      try {
        await deletePronunciationRequest(request.id, request.student_audio_url, response?.audio_url || null);
        router.push("/student/requests");
      } catch (err) {
        console.error("Fehler beim Löschen der Anfrage:", err);
        setSavingRef(false);
      }
    }
  };

  useEffect(() => {
    async function load() {
      const req = await getRequestById(id);
      setRequest(req);

      if (req) {
        // Schüler-Audio laden
        if (req.student_audio_url) {
          try {
            const url = await getSignedAudioUrl("student-audio", req.student_audio_url);
            const data = await fetchBlob(url);
            setStudentBlob(data);
          } catch {/* ignore */}
        }

        // Lehrer-Feedback laden
        const resp = await getResponseForRequest(id);
        setResponse(resp);

        if (resp?.audio_url) {
          try {
            const url = await getSignedAudioUrl("teacher-audio", resp.audio_url);
            const data = await fetchBlob(url);
            setTeacherBlob(data);
          } catch {/* ignore */}
        }
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neutral-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Anfrage nicht gefunden.</p>
        <Link href="/student/requests" className="text-emerald-400 hover:underline">{t.backToRequests}</Link>
      </div>
    );
  }

  const reviewed = request.status === "reviewed";

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/student/requests"
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-white">{t.detailTitle}</h1>
          </div>
          <button
            onClick={handleDeleteRequest}
            disabled={savingRef}
            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
            title="Anfrage löschen"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Wort-Karte */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <h2 className="text-6xl font-extrabold bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-3">
            {request.hanzi}
          </h2>
          {request.pinyin && (
            <p className="text-xl text-emerald-400 font-mono mb-1">{request.pinyin}</p>
          )}
          {request.german_meaning && (
            <p className="text-neutral-400">{request.german_meaning}</p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            {reviewed ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full text-sm font-bold">
                <CheckCircle2 size={14} />
                {t.statusReviewed}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full text-sm font-bold">
                <Clock size={14} />
                {t.statusPending}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-600 mt-3">
            {t.createdAt}: {new Date(request.created_at).toLocaleDateString("de-DE", {
              day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
            })}
          </p>
        </div>

        {/* Eigene Aufnahme */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mic2 size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{t.yourRecording}</h3>
          </div>
          {studentBlob ? (
            <AudioPlayer blob={studentBlob.blob} mimeType={studentBlob.mimeType} />
          ) : (
            <p className="text-neutral-600 text-sm text-center py-4">{de.audio.noRecording}</p>
          )}
        </div>

        {/* Lehrer-Feedback */}
        <div className={`bg-neutral-900 border rounded-2xl p-5 transition-all ${
          reviewed ? "border-emerald-800/50" : "border-neutral-800"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={16} className={reviewed ? "text-emerald-400" : "text-neutral-600"} />
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{t.teacherFeedback}</h3>
          </div>

          {!reviewed || !response ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                <Clock size={20} className="text-neutral-600" />
              </div>
              <p className="text-neutral-500 text-sm max-w-xs">{t.noFeedbackYet}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Kommentar */}
              {response.comment && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                    {t.teacherComment}
                  </p>
                  <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4">
                    <p className="text-neutral-200 text-sm leading-relaxed">{response.comment}</p>
                  </div>
                </div>
              )}

              {/* Lehrer-Audio */}
              {teacherBlob && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                    {t.teacherRecording}
                  </p>
                  <AudioPlayer blob={teacherBlob.blob} mimeType={teacherBlob.mimeType} />
                  
                  <button
                    onClick={handleSaveAsReference}
                    disabled={savingRef}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 text-emerald-400 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    {savingRef ? "Wird gespeichert..." : de.toneAnalyser.saveReferenceBtn}
                  </button>

                  {refSavedMsg && (
                    <p className="text-xs text-emerald-400 text-center font-semibold animate-in fade-in">
                      ✓ {refSavedMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
