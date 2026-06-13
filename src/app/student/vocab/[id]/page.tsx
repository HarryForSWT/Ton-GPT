"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, Trash2, CheckCircle2, Circle, Save, X, Calendar, Info } from "lucide-react";
import { getVocabById, updateVocab, deleteVocabWithAudio, Vocabulary, trackPractice } from "@/lib/db";
import { de } from "@/locales/de";
import { Button } from "@/components/ui/Button";
import { AudioControls } from "@/components/audio/AudioControls";
import { ToneAnalyser } from "@/components/audio/ToneAnalyser";
import { MandarinTTSPlayer } from "@/components/audio/MandarinTTSPlayer";

interface VocabularyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function VocabularyDetailPage({ params }: VocabularyDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [vocab, setVocab] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [practiceSuccess, setPracticeSuccess] = useState(false);
  const [recordingTrigger, setRecordingTrigger] = useState(0);

  // Edit form state
  const [form, setForm] = useState({
    hanzi: "",
    pinyin: "",
    pinyinNumber: "",
    germanMeaning: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getVocabById(id)
      .then((data) => {
        if (data) {
          setVocab(data);
          setForm({
            hanzi: data.hanzi,
            pinyin: data.pinyin,
            pinyinNumber: data.pinyinNumber,
            germanMeaning: data.germanMeaning,
          });
        }
      })
      .catch((err) => console.error("Error fetching vocabulary", err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!vocab) return;
    if (confirm(de.vocabDetail.deleteConfirm)) {
      try {
        await deleteVocabWithAudio(vocab.id);
        router.push("/student/vocab");
      } catch (err) {
        console.error("Error deleting vocabulary", err);
      }
    }
  };



  const handlePractice = async () => {
    if (!vocab) return;
    try {
      await trackPractice(vocab.id);
      const updated = await getVocabById(vocab.id);
      if (updated) {
        setVocab(updated);
      }
      setPracticeSuccess(true);
      setTimeout(() => setPracticeSuccess(false), 2500);
    } catch (err) {
      console.error("Error tracking practice:", err);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocab) return;

    const { hanzi, pinyin, pinyinNumber, germanMeaning } = form;
    if (!hanzi.trim() || !pinyin.trim() || !pinyinNumber.trim() || !germanMeaning.trim()) {
      setError(de.vocabAdd.errorRequired);
      return;
    }

    try {
      setSaving(true);
      const updatedVocab: Vocabulary = {
        ...vocab,
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim(),
        pinyinNumber: pinyinNumber.trim(),
        germanMeaning: germanMeaning.trim(),
      };
      await updateVocab(updatedVocab);
      setVocab(updatedVocab);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating vocabulary", err);
      setError("Fehler beim Speichern der Änderungen.");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Lade Vokabel-Details...</p>
        </div>
      </div>
    );
  }

  if (!vocab) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-neutral-400 mb-6">Vokabel wurde nicht gefunden oder existiert nicht.</p>
          <Link href="/student/vocab">
            <Button variant="secondary">{de.vocabDetail.backBtn}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const td = de.vocabDetail;

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 flex items-center justify-center relative overflow-hidden">
      {/* Background radial soft light for aesthetics */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Header navigation */}
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/student/vocab"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {td.backBtn}
          </Link>
          
          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 hover:text-emerald-400 rounded-xl transition-all"
                title={td.editBtn}
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 hover:text-red-400 rounded-xl transition-all"
                title={td.deleteBtn}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          /* Edit Mode Form */
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mb-6">
              {de.vocabEdit.title}
            </h1>

            {error && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {td.fields.hanzi}
                </label>
                <input
                  type="text"
                  name="hanzi"
                  value={form.hanzi}
                  onChange={handleEditChange}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-white transition-all outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {td.fields.pinyin}
                  </label>
                  <input
                    type="text"
                    name="pinyin"
                    value={form.pinyin}
                    onChange={handleEditChange}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-white transition-all outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {td.fields.pinyinNumber}
                  </label>
                  <input
                    type="text"
                    name="pinyinNumber"
                    value={form.pinyinNumber}
                    onChange={handleEditChange}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-white transition-all outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  {td.fields.germanMeaning}
                </label>
                <input
                  type="text"
                  name="germanMeaning"
                  value={form.germanMeaning}
                  onChange={handleEditChange}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-white transition-all outline-none"
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setError("");
                    setForm({
                      hanzi: vocab.hanzi,
                      pinyin: vocab.pinyin,
                      pinyinNumber: vocab.pinyinNumber,
                      germanMeaning: vocab.germanMeaning,
                    });
                  }}
                  disabled={saving}
                  className="flex-1"
                >
                  <X size={16} />
                  {de.vocabEdit.cancelBtn}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  className="flex-1"
                >
                  <Save size={16} />
                  {saving ? "Wird gespeichert..." : de.vocabEdit.saveBtn}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* View Mode Card */
          <div className="space-y-6">
            
            {/* Main Hanzi display */}
            <div className="text-center py-6 bg-neutral-950/40 border border-neutral-850 rounded-2xl">
              <h2 className="text-6xl font-extrabold tracking-wide mb-3 bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
                {vocab.hanzi}
              </h2>
              <p className="text-xl text-emerald-400 font-medium font-mono mb-1">{vocab.pinyin}</p>
              <p className="text-neutral-500 text-sm font-mono">{vocab.pinyinNumber}</p>
            </div>

            {/* Standard Speech Synthesis TTS Player */}
            <div className="bg-neutral-950/20 border border-neutral-850/80 rounded-2xl p-4">
              <MandarinTTSPlayer text={vocab.hanzi} pinyin={vocab.pinyin} />
            </div>

            {/* Meanings & translation details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {td.fields.germanMeaning}
                </label>
                <p className="text-lg font-semibold text-neutral-100">{vocab.germanMeaning}</p>
              </div>

              {/* Status und Aktionen */}
              <div className="flex flex-col gap-3.5 p-4 bg-neutral-950/20 border border-neutral-800/80 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                      {td.statusLabel}
                    </span>
                    <span className={`text-sm font-bold mt-0.5 inline-block ${vocab.learned ? "text-emerald-400" : "text-neutral-400"}`}>
                      {vocab.learned ? td.learned : td.notLearned}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {vocab.learned ? (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-extrabold">
                        <CheckCircle2 size={12} className="text-emerald-400 fill-emerald-500/10" />
                        Bestanden
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-850 text-neutral-400 border border-neutral-800 rounded-xl text-xs font-bold">
                        <Circle size={12} className="text-neutral-500" />
                        Gesperrt
                      </span>
                    )}
                  </div>
                </div>

                {/* Manueller Üben-Button */}
                <div className="border-t border-neutral-850 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                      Aktivität
                    </span>
                    <span className="text-xs text-neutral-400 mt-0.5 block">
                      Als heute geübt eintragen
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePractice}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-bold transition-all"
                  >
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    {de.calendar.practiceBtn}
                  </button>
                </div>

                {/* Aussprache-Feedback anfragen */}
                <div className="border-t border-neutral-850 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block">
                      Lehrer-Feedback
                    </span>
                    <span className="text-xs text-neutral-400 mt-0.5 block">
                      Aussprache vom Lehrer bewerten lassen
                    </span>
                  </div>
                  <Link
                    href={`/student/requests/new?vocabId=${vocab.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold transition-all"
                  >
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    Anfragen
                  </Link>
                </div>


                {/* Erklärung zur Aktivität */}
                <div className="border-t border-neutral-850 pt-3.5 flex items-start gap-2 text-[10px] text-neutral-500 leading-normal">
                  <Info size={12} className="shrink-0 mt-0.5 text-neutral-600" />
                  <p>
                    „Üben“ hält deine tägliche Lernsträhne im Kalender aktiv. Der Status „Gelernt“ wird automatisch freigeschaltet, sobald du beim maschinellen Aussprache-Vergleich einen Wert von mindestens 67 % erreichst.
                  </p>
                </div>
              </div>

              {/* Erfolgsmeldung fürs Üben */}
              {practiceSuccess && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 rounded-2xl text-xs text-center font-medium animate-in fade-in slide-in-from-top-2 duration-200">
                  ✓ {de.calendar.practiceSuccess}
                </div>
              )}

              {/* metadata and extras */}
              <div className="border-t border-neutral-800/80 pt-4 grid grid-cols-1 gap-3 text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-neutral-500" />
                  <span>{td.createdAtLabel}: {formatDate(vocab.createdAt)}</span>
                </div>
                
                {vocab.learned && vocab.learnedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500/60" />
                    <span>{td.learnedAtLabel}: {formatDate(vocab.learnedAt)}</span>
                  </div>
                )}

                {vocab.lastPracticedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-neutral-500" />
                    <span>{td.lastPracticedAtLabel}: {formatDate(vocab.lastPracticedAt)}</span>
                  </div>
                )}

                {/* Best Score (if available) */}
                <div className="flex items-center justify-between py-1 text-neutral-400 text-xs">
                  <span>{de.toneAnalyser.scoreHistory}</span>
                  <span className="font-semibold text-neutral-200">
                    {vocab.bestScore > 0 ? `${vocab.bestScore}%` : de.toneAnalyser.noScore}
                  </span>
                </div>
              </div>

              {/* Lehrer-Aussprache (Referenz) */}
              <div className="border-t border-neutral-800/80 pt-4">
                <AudioControls
                  vocabId={vocab.id}
                  role="teacher"
                  label={td.teacherAudioLabel}
                  hideRecorder={true}
                />
              </div>

              {/* Audio Recording Section */}
              <div className="border-t border-neutral-800/80 pt-4">
                <AudioControls
                  vocabId={vocab.id}
                  role="student"
                  label={td.myRecordingLabel}
                  onRecordingSaved={() => setRecordingTrigger(prev => prev + 1)}
                />
              </div>

              {/* Tone Analyser Section */}
              <div className="border-t border-neutral-800/80 pt-4">
                <ToneAnalyser
                  vocabId={vocab.id}
                  recordingTrigger={recordingTrigger}
                  onAnalysisComplete={async (score, pitchScore) => {
                    try {
                      const maxScore = Math.max(vocab.bestScore || 0, score);
                      const isLearned = pitchScore >= 67;
                      
                      const updatedVocab: Vocabulary = {
                        ...vocab,
                        bestScore: maxScore,
                        learned: isLearned ? true : vocab.learned,
                        learnedAt: isLearned && !vocab.learned ? new Date().toISOString() : vocab.learnedAt,
                      };
                      
                      const { updateVocab } = await import("@/lib/db");
                      await updateVocab(updatedVocab);
                      setVocab(updatedVocab);
                    } catch (err) {
                      console.error("Fehler beim Speichern der Analysebewertung:", err);
                    }
                  }}
                />
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
