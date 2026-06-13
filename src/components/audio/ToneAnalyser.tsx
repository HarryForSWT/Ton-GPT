"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Award, AlertCircle, Play, Info } from "lucide-react";
import { de } from "@/locales/de";
import { getAudioRecordingsByVocabId, getVocabById, AudioRecording, Vocabulary } from "@/lib/db";
import { analyzeAndCompare, analyzeAndCompareWithTTS, AnalysisResult } from "@/lib/audioAnalysis";

interface ToneAnalyserProps {
  vocabId: string;
  recordingTrigger?: number;
  onAnalysisComplete?: (score: number) => void;
}

export function ToneAnalyser({ vocabId, recordingTrigger, onAnalysisComplete }: ToneAnalyserProps) {
  const t = de.toneAnalyser;

  const [studentRecording, setStudentRecording] = useState<AudioRecording | null>(null);
  const [studentRecordings, setStudentRecordings] = useState<AudioRecording[]>([]);
  const [teacherRecording, setTeacherRecording] = useState<AudioRecording | null>(null);
  const [vocab, setVocab] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Aufnahmen laden
  const loadRecordings = useCallback(async () => {
    try {
      const v = await getVocabById(vocabId);
      if (v) setVocab(v);

      const recordings = await getAudioRecordingsByVocabId(vocabId);
      
      // Jeweils die neueste Aufnahme nehmen
      const studentRecs = recordings
        .filter((r) => r.role === "student")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      const teacherRecs = recordings
        .filter((r) => r.role === "teacher")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setStudentRecordings(studentRecs);
      
      // Default to the newest student recording
      if (studentRecs.length > 0) {
        setStudentRecording(studentRecs[0]);
      } else {
        setStudentRecording(null);
      }
      setTeacherRecording(teacherRecs[0] || null);
    } catch (err) {
      console.error("Fehler beim Laden der Aufnahmen:", err);
    } finally {
      setLoading(false);
    }
  }, [vocabId]);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings, recordingTrigger]);

  // Diagramm zeichnen
  useEffect(() => {
    if (!result || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // HD-DPI Anpassung
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Hintergrund reinigen
    ctx.clearRect(0, 0, width, height);

    // Raster zeichnen
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    
    // Horizontale Gitterlinien
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = (i / gridLines) * (height - 20) + 10;
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();
    }

    // Vertikale Gitterlinien (Phasen)
    const phases = 4;
    for (let i = 0; i <= phases; i++) {
      const x = (i / phases) * (width - 40) + 20;
      ctx.beginPath();
      ctx.moveTo(x, 10);
      ctx.lineTo(x, height - 10);
      ctx.stroke();
    }

    const drawPitchTrack = (data: number[], color: string, glowColor: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Glow-Effekt
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;

      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * (width - 40) + 20;
        // Z-Score mappen: 0 ist die Mitte, Standardabweichung von 2.5 bis nach oben/unten mappen
        const mappedY = height / 2 - (data[i] * (height / 6.5));
        
        // Grenzen absichern
        const y = Math.max(10, Math.min(height - 10, mappedY));

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Zurücksetzen
    };

    // 1. Lehrer-Referenz zeichnen (Grün)
    drawPitchTrack(result.teacherPitch, "#10b981", "rgba(16, 185, 129, 0.4)");

    // 2. Schüler-Tonhöhe zeichnen (Amber/Orange)
    drawPitchTrack(result.studentPitch, "#f59e0b", "rgba(245, 158, 11, 0.4)");

  }, [result]);

  const handleStartAnalysis = async () => {
    if (!studentRecording) return;
    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      let analysisResult;
      if (teacherRecording) {
        // Normaler Vergleich mit Lehrer-Referenzaudio
        analysisResult = await analyzeAndCompare(studentRecording.blob, teacherRecording.blob);
      } else if (vocab) {
        // Vergleich mit künstlichem Standard-Ausspracheverlauf (TTS)
        analysisResult = await analyzeAndCompareWithTTS(
          studentRecording.blob,
          vocab.pinyinNumber || vocab.pinyin,
          vocab.pinyin
        );
      } else {
        throw new Error("Vokabeldaten nicht geladen.");
      }

      setResult(analysisResult);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisResult.score);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : "Fehler bei der Audio-Analyse.";
      setError(errMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const getQualitativeRating = (score: number) => {
    if (score >= 85) return { text: t.resultExcellent, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 67) return { text: t.resultGood, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { text: t.resultNeedWork, color: "text-red-400 bg-red-500/10 border-red-500/20" };
  };

  if (loading) return null;

  const hasStudent = !!studentRecording;
  const hasTeacher = !!teacherRecording;

  return (
    <div className="bg-neutral-950/30 border border-neutral-850 rounded-2xl p-5 space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
        <div>
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">{t.title}</h3>
          <p className="text-[11px] text-neutral-500 mt-0.5">{t.subtitle}</p>
        </div>
        <Award className="w-5 h-5 text-emerald-400" />
      </div>

      {/* Fehlende Aufnahmen */}
      {!hasStudent && (
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl flex gap-3 text-xs text-neutral-400">
          <AlertCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <p>Für dieses Wort sind noch keine Aufnahmen vorhanden. Bitte nimm deine Aussprache auf.</p>
          </div>
        </div>
      )}

      {hasStudent && !hasTeacher && (
        <div className="p-4 bg-blue-950/20 border border-blue-900/40 rounded-xl flex gap-3 text-xs text-blue-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p>Kein Lehrer-Audio als Referenz vorhanden. Deine Aussprache wird stattdessen mit dem mathematischen Standard-Tonverlauf verglichen.</p>
          </div>
        </div>
      )}

      {/* Aufnahme-Auswahl (nur wenn der Schüler mindestens 1 Aufnahme hat) */}
      {studentRecordings.length > 0 && (
        <div className="space-y-1.5 p-3.5 bg-neutral-900/40 border border-neutral-850 rounded-xl">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">
            Auszustellende Aufnahme für den Vergleich:
          </label>
          <select
            value={studentRecording?.id || ""}
            onChange={(e) => {
              const rec = studentRecordings.find(r => r.id === e.target.value);
              if (rec) {
                setStudentRecording(rec);
                setResult(null); // Clear previous result when changing recording
                setError("");
              }
            }}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 outline-none focus:border-emerald-500 transition-all cursor-pointer font-mono"
          >
            {studentRecordings.map((r, idx) => (
              <option key={r.id} value={r.id}>
                Aufnahme {studentRecordings.length - idx} — {new Date(r.createdAt).toLocaleDateString("de-DE")} ({new Date(r.createdAt).toLocaleTimeString("de-DE", { hour: '2-digit', minute: '2-digit' })})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fehler-Banner */}
      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl text-xs font-medium flex gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Button & Loader */}
      {hasStudent && !result && (
        <button
          onClick={handleStartAnalysis}
          disabled={analyzing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-neutral-950 font-bold rounded-xl text-sm transition-all active:scale-98 disabled:opacity-50 shadow-lg shadow-emerald-500/10"
        >
          {analyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-neutral-950/40 border-t-neutral-950 rounded-full animate-spin" />
              {t.analyzing}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-neutral-950" />
              {hasTeacher ? t.analyzeBtn : "Mit Standard-Tönen vergleichen"}
            </>
          )}
        </button>
      )}

      {/* Ergebnisse */}
      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          
          {/* Gesamtbewertung */}
          <div className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-850 rounded-xl">
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t.overallScore}</p>
              <p className="text-xs text-neutral-400 mt-0.5">Basiert auf Tonkurve, Sprechtempo & Rhythmus</p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-white">{result.score}%</span>
              <div className={`mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getQualitativeRating(result.score).color}`}>
                {getQualitativeRating(result.score).text}
              </div>
            </div>
          </div>

          {/* Canvas-Diagramm */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Tonhöhenverlauf (Pitch-Shape)</p>
            <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-3 relative">
              <canvas ref={canvasRef} className="w-full h-44 block" />
              
              {/* Diagramm-Legende */}
              <div className="flex justify-center gap-4 mt-3 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#f59e0b] rounded-full" />
                  <span>{t.legendStudent}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#10b981] rounded-full" />
                  <span>{hasTeacher ? t.legendTeacher : "Standard-Referenz"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detaillierte Kriterien */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Detaillierte Metriken</p>
            
            {/* Tonverlauf */}
            <div className="bg-neutral-900/40 border border-neutral-850 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">{t.pitchContour}</span>
                <span className={`text-xs font-extrabold ${result.pitchScore >= 67 ? "text-emerald-400" : "text-red-400"}`}>
                  {result.pitchScore}%
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span>{result.pitchFeedback}</span>
              </p>
            </div>

            {/* Silbenlänge */}
            <div className="bg-neutral-900/40 border border-neutral-850 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">{t.duration}</span>
                <span className={`text-xs font-extrabold ${result.durationScore >= 67 ? "text-emerald-400" : "text-red-400"}`}>
                  {result.durationScore}%
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span>{result.durationFeedback}</span>
              </p>
            </div>

            {/* Sprechrhythmus */}
            <div className="bg-neutral-900/40 border border-neutral-850 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-300">{t.rhythm}</span>
                <span className={`text-xs font-extrabold ${result.rhythmScore >= 67 ? "text-emerald-400" : "text-red-400"}`}>
                  {result.rhythmScore}%
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                <span>{result.rhythmFeedback}</span>
              </p>
            </div>

          </div>

          {/* Erneuter Vergleich */}
          <button
            onClick={handleStartAnalysis}
            disabled={analyzing}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-all font-semibold rounded-xl text-xs active:scale-98 disabled:opacity-50"
          >
            {analyzing ? t.analyzing : "Erneut analysieren"}
          </button>

        </div>
      )}

    </div>
  );
}
