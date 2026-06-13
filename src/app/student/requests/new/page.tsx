"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, ChevronDown, Info } from "lucide-react";
import { de } from "@/locales/de";
import { Button } from "@/components/ui/Button";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { getVocabList, Vocabulary } from "@/lib/db";
import { createPronunciationRequest, uploadAudio } from "@/lib/requests";

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function NewRequestPage() {
  const router = useRouter();
  const t = de.requests;
  const ta = de.audio;

  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [selectedVocabId, setSelectedVocabId] = useState<string>("");
  const [manualHanzi, setManualHanzi] = useState("");
  const [manualPinyin, setManualPinyin] = useState("");
  const [manualMeaning, setManualMeaning] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    state: recState,
    durationMs,
    audioBlob,
    mimeType,
    error: recError,
    startRecording,
    stopRecording,
    cancelRecording,
    reset: resetRecording,
  } = useAudioRecorder();

  const pinyinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getVocabList().then(setVocabList);
  }, []);

  // Wenn eine Vokabel aus der Liste gewählt wird, Felder befüllen
  const handleVocabSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedVocabId(id);
    if (id) {
      const v = vocabList.find((x) => x.id === id);
      if (v) {
        setManualHanzi(v.hanzi);
        setManualPinyin(v.pinyin || v.pinyinNumber);
        setManualMeaning(v.germanMeaning);
      }
    } else {
      setManualHanzi("");
      setManualPinyin("");
      setManualMeaning("");
    }
  };

  const handleSubmit = async () => {
    setError("");
    if (!manualHanzi.trim()) {
      setError(t.errorNoWord);
      return;
    }

    try {
      setSubmitting(true);

      let storagePath: string | undefined = undefined;

      // Audio in Supabase Storage hochladen (nur falls aufgenommen wurde)
      if (audioBlob) {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const fileName = `${Date.now()}.${ext}`;
        storagePath = await uploadAudio("student-audio", fileName, audioBlob);
      }

      // Anfrage in der Datenbank erstellen
      await createPronunciationRequest({
        hanzi: manualHanzi.trim(),
        pinyin: manualPinyin.trim(),
        german_meaning: manualMeaning.trim() || undefined,
        student_audio_url: storagePath,
      });

      router.push("/student/requests");
    } catch (err) {
      console.error(err);
      setError(t.errorUpload);
    } finally {
      setSubmitting(false);
    }
  };

  const isRecording = recState === "recording";
  const isRequesting = recState === "requesting";
  const hasBlobReady = recState === "stopped" && !!audioBlob;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 flex items-start justify-center">
      <div className="w-full max-w-lg my-4 space-y-0">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/student/requests"
            className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {t.newTitle}
            </h1>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* Vokabel aus Liste wählen */}
          {vocabList.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-3">
                {t.selectWordLabel}
              </label>
              <div className="relative">
                <select
                  value={selectedVocabId}
                  onChange={handleVocabSelect}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-white appearance-none outline-none pr-10 transition-all"
                >
                  <option value="">{t.selectWordPlaceholder}</option>
                  {vocabList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.hanzi} — {v.germanMeaning}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Wort-Details (manuell / aus Liste befüllt) */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              {vocabList.length > 0 ? t.orManualLabel : t.hanziLabel}
            </label>

            {/* Hanzi */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">{t.hanziLabel} <span className="text-emerald-400">*</span></label>
              <input
                type="text"
                value={manualHanzi}
                onChange={(e) => { setManualHanzi(e.target.value); setSelectedVocabId(""); setError(""); }}
                placeholder={t.hanziPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-white text-2xl placeholder-neutral-600 outline-none transition-all"
              />
            </div>

            {/* Pinyin */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">{t.pinyinLabel}</label>
              <input
                ref={pinyinRef}
                type="text"
                value={manualPinyin}
                onChange={(e) => { setManualPinyin(e.target.value); setSelectedVocabId(""); }}
                placeholder={t.pinyinPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-white placeholder-neutral-600 outline-none transition-all"
              />
            </div>

            {/* Deutsche Bedeutung */}
            <div>
              <label className="text-xs text-neutral-500 block mb-1">{t.germanMeaningLabel}</label>
              <input
                type="text"
                value={manualMeaning}
                onChange={(e) => { setManualMeaning(e.target.value); setSelectedVocabId(""); }}
                placeholder={t.germanMeaningPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl p-3 text-white placeholder-neutral-600 outline-none transition-all"
              />
            </div>
          </div>

          {/* Audio-Aufnahme */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {t.recordingLabel} <span className="text-neutral-500 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <Info size={11} />
                <span>{t.recordingHint}</span>
              </div>
            </div>

            {/* Recorder Error */}
            {recError && (
              <div className="mb-3 p-3 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-sm">
                {recError}
              </div>
            )}

            {/* Mic Button */}
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
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 active:scale-90 shadow-xl shadow-red-500/30"
                      : isRequesting
                        ? "bg-neutral-800 cursor-not-allowed"
                        : hasBlobReady
                          ? "bg-emerald-500/20 border-2 border-emerald-500 cursor-default"
                          : "bg-emerald-500 hover:bg-emerald-600 active:scale-90 shadow-xl shadow-emerald-500/30"
                  }`}
                >
                  {isRequesting ? (
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isRecording ? (
                    <svg className="w-7 h-7 text-white fill-white" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  ) : hasBlobReady ? (
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                  )}
                </button>
              </div>

              <div className="text-center">
                {recState === "idle" && (
                  <p className="text-neutral-400 text-sm">{ta.tapToRecord}</p>
                )}
                {isRequesting && (
                  <p className="text-neutral-400 text-sm animate-pulse">{ta.requestingLabel}</p>
                )}
                {isRecording && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-red-400 text-sm font-medium">{ta.recordingLabel}</span>
                    </div>
                    <span className="text-white text-2xl font-mono font-bold tabular-nums">
                      {formatDuration(durationMs)}
                    </span>
                  </div>
                )}
                {hasBlobReady && (
                  <p className="text-emerald-400 text-sm font-semibold">{ta.recordingComplete} — {formatDuration(durationMs)}</p>
                )}
                {recState === "error" && (
                  <button onClick={() => { cancelRecording(); resetRecording(); }} className="text-neutral-400 hover:text-white text-sm underline">
                    Erneut versuchen
                  </button>
                )}
              </div>

              {/* Neu aufnehmen */}
              {hasBlobReady && (
                <button
                  type="button"
                  onClick={resetRecording}
                  className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  {ta.reRecordBtn}
                </button>
              )}

              {/* Abbrechen während Aufnahme */}
              {(isRecording || isRequesting) && (
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
                >
                  {ta.cancelBtn}
                </button>
              )}
            </div>
          </div>

          {/* Absenden */}
          <div className="flex gap-3 pb-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/student/requests")}
              disabled={submitting}
              className="flex-1"
            >
              {t.cancelBtn}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              disabled={submitting || !manualHanzi.trim()}
              className="flex-1 shadow-lg shadow-emerald-500/10"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t.uploading}
                </>
              ) : (
                <>
                  <Send size={16} />
                  {t.submitBtn}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
