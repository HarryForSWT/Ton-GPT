"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Mic2, MessageSquare, CheckCircle2, Trash2 } from "lucide-react";
import { de } from "@/locales/de";
import {
  getRequestById,
  getResponseForRequest,
  getSignedAudioUrl,
  submitTeacherResponse,
  deletePronunciationRequest,
  uploadAudio,
  PronunciationRequest,
  TeacherResponse,
} from "@/lib/requests";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

async function fetchBlob(url: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    
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

export default function ReviewRequestPage({ params }: Props) {
  const router = useRouter();
  const { id } = use(params);
  const t = de.teacherReview;
  const ta = de.audio;

  const [request, setRequest] = useState<PronunciationRequest | null>(null);
  const [existingResponse, setExistingResponse] = useState<TeacherResponse | null>(null);
  const [studentBlob, setStudentBlob] = useState<{ blob: Blob; mimeType: string } | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const {
    state: recState,
    durationMs,
    audioBlob,
    mimeType: recMimeType,
    error: recError,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecording,
  } = useAudioRecorder();

  useEffect(() => {
    async function load() {
      const req = await getRequestById(id);
      setRequest(req);

      if (req?.student_audio_url) {
        try {
          const url = await getSignedAudioUrl("student-audio", req.student_audio_url);
          const data = await fetchBlob(url);
          setStudentBlob(data);
        } catch {/* ignore */}
      }

      const resp = await getResponseForRequest(id);
      setExistingResponse(resp);
      if (resp) {
        setComment(resp.comment ?? "");
        setSubmitted(true);
      }

      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = useCallback(async () => {
    setError("");

    if (!comment.trim() && !audioBlob) {
      setError(t.errorNoFeedback);
      return;
    }

    try {
      setSubmitting(true);

      // Lehrer-Audio hochladen (falls vorhanden)
      let audioPath = "no-audio";
      if (audioBlob) {
        const ext = recMimeType.includes("mp4") ? "mp4" : "webm";
        const fileName = `teacher_${id}_${Date.now()}.${ext}`;
        audioPath = await uploadAudio("teacher-audio", fileName, audioBlob);
      }

      await submitTeacherResponse({
        request_id: id,
        comment: comment.trim(),
        audio_url: audioPath,
        audio_duration: durationMs,
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError(t.errorUpload);
    } finally {
      setSubmitting(false);
    }
  }, [comment, audioBlob, recMimeType, id, durationMs, t]);

  const handleDeleteRequest = async () => {
    if (!request) return;
    if (confirm("Möchtest du diese Anfrage wirklich endgültig aus der Cloud löschen? (Das Schüler-Audio und dein Feedback gehen dabei verloren)")) {
      setSubmitting(true);
      try {
        await deletePronunciationRequest(request.id, request.student_audio_url, existingResponse?.audio_url || null);
        router.push("/teacher");
      } catch (err) {
        console.error("Fehler beim Löschen der Anfrage:", err);
        setSubmitting(false);
      }
    }
  };

  const isRecording = recState === "recording";
  const isRequesting = recState === "requesting";
  const hasBlobReady = recState === "stopped" && !!audioBlob;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">Anfrage nicht gefunden.</p>
        <Link href="/teacher" className="text-blue-400 hover:underline">{t.backBtn}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/teacher"
              className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-white">{t.title}</h1>
          </div>
          <button
            onClick={handleDeleteRequest}
            disabled={submitting}
            className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
            title="Anfrage löschen"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* Bereits beantwortet */}
        {submitted && (
          <div className="flex items-center gap-3 p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-2xl">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm font-medium">{t.submitSuccess}</p>
          </div>
        )}

        {/* Wort-Karte */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t.wordSectionTitle}</p>
          <h2 className="text-6xl font-extrabold bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent mb-3">
            {request.hanzi}
          </h2>
          {request.pinyin && (
            <p className="text-xl text-blue-400 font-mono mb-1">{request.pinyin}</p>
          )}
          {request.german_meaning && (
            <p className="text-neutral-400 text-sm">{request.german_meaning}</p>
          )}
          {request.profiles && (
            <p className="mt-4 text-xs text-neutral-600">
              {t.studentLabel}: {request.profiles.display_name || request.profiles.email}
            </p>
          )}
        </div>

        {/* Schüler-Aufnahme */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mic2 size={16} className="text-blue-400" />
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
              {t.studentRecordingLabel}
            </h3>
          </div>
          {studentBlob ? (
            <AudioPlayer blob={studentBlob.blob} mimeType={studentBlob.mimeType} />
          ) : (
            <p className="text-neutral-600 text-sm text-center py-4">{t.noStudentRecording}</p>
          )}
        </div>

        {/* Feedback-Bereich — deaktiviert wenn bereits beantwortet */}
        {!submitted ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-blue-400" />
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">{t.feedbackSectionTitle}</h3>
            </div>

            {/* Referenz-Aufnahme */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t.recordReferenceLabel}</p>

              {recError && (
                <div className="mb-3 p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-sm">{recError}</div>
              )}

              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  {isRecording && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                      <span className="absolute inset-0 rounded-full bg-red-500/10 animate-pulse" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : (!hasBlobReady ? startRecording : undefined)}
                    disabled={isRequesting || submitting}
                    className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600 active:scale-90 shadow-lg shadow-red-500/30"
                        : isRequesting
                          ? "bg-neutral-800 cursor-not-allowed"
                          : hasBlobReady
                            ? "bg-emerald-500/20 border-2 border-emerald-500 cursor-default"
                            : "bg-blue-500 hover:bg-blue-600 active:scale-90 shadow-lg shadow-blue-500/30"
                    }`}
                  >
                    {isRequesting ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isRecording ? (
                      <svg className="w-6 h-6 text-white fill-white" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    ) : hasBlobReady ? (
                      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  {recState === "idle" && <p className="text-neutral-500 text-xs">{ta.tapToRecord}</p>}
                  {isRequesting && <p className="text-neutral-400 text-xs animate-pulse">{ta.requestingLabel}</p>}
                  {isRecording && (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 text-xs">{ta.recordingLabel}</span>
                      </div>
                      <span className="text-white text-xl font-mono font-bold">{formatDuration(durationMs)}</span>
                    </div>
                  )}
                  {hasBlobReady && (
                    <p className="text-emerald-400 text-xs font-semibold">{ta.recordingComplete} — {formatDuration(durationMs)}</p>
                  )}
                </div>

                {hasBlobReady && (
                  <button type="button" onClick={resetRecording} className="text-xs text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                    {ta.reRecordBtn}
                  </button>
                )}
                {(isRecording || isRequesting) && (
                  <button type="button" onClick={cancelRecording} className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">{ta.cancelBtn}</button>
                )}
              </div>
            </div>

            {/* Kommentar */}
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">{t.commentLabel}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.commentPlaceholder}
                rows={4}
                disabled={submitting}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl p-4 text-white placeholder-neutral-600 outline-none transition-all resize-none text-sm"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-sm">{error}</div>
            )}

            {/* Absenden */}
            <button
              onClick={handleSubmit}
              disabled={submitting || (!comment.trim() && !audioBlob)}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t.uploading}
                </>
              ) : (
                <>
                  <Send size={18} />
                  {t.submitBtn}
                </>
              )}
            </button>
          </div>
        ) : existingResponse && (
          /* Bereits gesendetes Feedback anzeigen */
          <div className="bg-neutral-900 border border-emerald-800/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-emerald-400" />
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">Gesendetes Feedback</h3>
            </div>
            {existingResponse.comment && (
              <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-4">
                <p className="text-neutral-200 text-sm leading-relaxed">{existingResponse.comment}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
