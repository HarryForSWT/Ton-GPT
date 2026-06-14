"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, RotateCcw, CheckCircle2, XCircle, Award, Sparkles } from "lucide-react";
import { getVocabList, Vocabulary, trackPractice, saveListeningSessionResult } from "@/lib/db";
import { Button } from "@/components/ui/Button";

type Screen = "config" | "play" | "score";

interface Question {
  word: Vocabulary;
  choices: string[];
  selectedChoice: string | null;
  isCorrect: boolean | null;
  type: "standard" | "tone";
}

// ─── Tone variation generator structures ────────────────────────────────────
const ACCENTED_MAP: Record<string, { family: number; tone: number }> = {
  'ā': { family: 0, tone: 1 }, 'á': { family: 0, tone: 2 }, 'ǎ': { family: 0, tone: 3 }, 'à': { family: 0, tone: 4 },
  'ē': { family: 1, tone: 1 }, 'é': { family: 1, tone: 2 }, 'ě': { family: 1, tone: 3 }, 'è': { family: 1, tone: 4 },
  'ī': { family: 2, tone: 1 }, 'í': { family: 2, tone: 2 }, 'ǐ': { family: 2, tone: 3 }, 'ì': { family: 2, tone: 4 },
  'ō': { family: 3, tone: 1 }, 'ó': { family: 3, tone: 2 }, 'ǒ': { family: 3, tone: 3 }, 'ò': { family: 3, tone: 4 },
  'ū': { family: 4, tone: 1 }, 'ú': { family: 4, tone: 2 }, 'ǔ': { family: 4, tone: 3 }, 'ù': { family: 4, tone: 4 },
  'ǖ': { family: 5, tone: 1 }, 'ǘ': { family: 5, tone: 2 }, 'ǚ': { family: 5, tone: 3 }, 'ǜ': { family: 5, tone: 4 },
  'Ā': { family: 0, tone: 1 }, 'Á': { family: 0, tone: 2 }, 'Ǎ': { family: 0, tone: 3 }, 'À': { family: 0, tone: 4 },
  'Ē': { family: 1, tone: 1 }, 'É': { family: 1, tone: 2 }, 'Ě': { family: 1, tone: 3 }, 'È': { family: 1, tone: 4 },
  'Ī': { family: 2, tone: 1 }, 'Í': { family: 2, tone: 2 }, 'Ǐ': { family: 2, tone: 3 }, 'Ì': { family: 2, tone: 4 },
  'Ō': { family: 3, tone: 1 }, 'Ó': { family: 3, tone: 2 }, 'Ǒ': { family: 3, tone: 3 }, 'Ò': { family: 3, tone: 4 },
  'Ū': { family: 4, tone: 1 }, 'Ú': { family: 4, tone: 2 }, 'Ǔ': { family: 4, tone: 3 }, 'Ù': { family: 4, tone: 4 },
  'Ǖ': { family: 5, tone: 1 }, 'Ǘ': { family: 5, tone: 2 }, 'Ǚ': { family: 5, tone: 3 }, 'Ǜ': { family: 5, tone: 4 },
};

const TONE_MATRIX = [
  ['a', 'ā', 'á', 'ǎ', 'à'],
  ['e', 'ē', 'é', 'ě', 'è'],
  ['i', 'ī', 'í', 'ǐ', 'ì'],
  ['o', 'ō', 'ó', 'ǒ', 'ò'],
  ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
];

const TONE_MATRIX_UPPER = [
  ['A', 'Ā', 'Á', 'Ǎ', 'À'],
  ['E', 'Ē', 'É', 'Ě', 'È'],
  ['I', 'Ī', 'Í', 'Ǐ', 'Ì'],
  ['O', 'Ō', 'Ó', 'Ǒ', 'Ò'],
  ['U', 'Ū', 'Ú', 'Ǔ', 'Ù'],
  ['Ü', 'Ǖ', 'Ǘ', 'Ǚ', 'Ǜ'],
];

function getToneDistractors(pinyin: string): string[] {
  const tonePositions: { index: number; family: number; isUpper: boolean }[] = [];
  
  for (let i = 0; i < pinyin.length; i++) {
    const char = pinyin[i];
    if (ACCENTED_MAP[char]) {
      const { family } = ACCENTED_MAP[char];
      const isUpper = char === char.toUpperCase();
      tonePositions.push({ index: i, family, isUpper });
    }
  }

  if (tonePositions.length === 0) {
    return [];
  }

  const distractors = new Set<string>();
  let attempts = 0;
  
  while (distractors.size < 3 && attempts < 100) {
    attempts++;
    const candidate = pinyin.split('');
    for (const pos of tonePositions) {
      const randomTone = Math.floor(Math.random() * 4) + 1; // Tones 1 to 4
      const matrix = pos.isUpper ? TONE_MATRIX_UPPER : TONE_MATRIX;
      candidate[pos.index] = matrix[pos.family][randomTone];
    }
    const candidateStr = candidate.join('');
    if (candidateStr !== pinyin) {
      distractors.add(candidateStr);
    }
  }

  return Array.from(distractors);
}

export default function ListeningPracticePage() {

  // ─── App States ──────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("config");
  const [loading, setLoading] = useState(true);
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);

  // ─── Config States ────────────────────────────────────────────────────────
  const [selectedDifficulties, setSelectedDifficulties] = useState<("easy" | "medium" | "hard")[]>(["easy"]);
  const [questionCount, setQuestionCount] = useState<10 | 20 | 50>(10);

  // ─── Game Play States ──────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Speech Synthesis System Voice ───────────────────────────────────────
  const [mandarinVoice, setMandarinVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    // Vokabeln aus IndexedDB laden
    getVocabList()
      .then((list) => {
        setVocabList(list);
      })
      .catch((err) => console.error("Fehler beim Laden der Vokabeln:", err))
      .finally(() => setLoading(false));

    // Chinesische TTS-Stimme finden
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const findVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const mandarinLocales = ["zh-cn", "zh-hans", "zh"];
        let found = voices.find(v => mandarinLocales.includes(v.lang.toLowerCase()));
        if (!found) {
          found = voices.find(v => v.lang.toLowerCase().startsWith("zh"));
        }
        setMandarinVoice(found || null);
      };

      findVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = findVoice;
      }
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  // ─── Audio Synthesizer & Player (Echte Stimme priorisieren, TTS als Fallback) ───
  const playWordAudio = async (word: Vocabulary) => {
    if (typeof window === "undefined") return;

    // Laufende Audios abbrechen
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    try {
      const { getAudioRecordingsByVocabId } = await import("@/lib/db");
      const recordings = await getAudioRecordingsByVocabId(word.id);
      const teacherRecording = recordings.find(r => r.role === "teacher");

      if (teacherRecording && teacherRecording.blob) {
        const url = URL.createObjectURL(teacherRecording.blob);
        const audio = new Audio(url);
        activeAudioRef.current = audio;
        
        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(url);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(url);
          activeAudioRef.current = null;
          speakTTSFallback(word.hanzi);
        };
        await audio.play();
      } else {
        speakTTSFallback(word.hanzi);
      }
    } catch (err) {
      console.error("Fehler beim Abspielen des Lehrer-Audios:", err);
      speakTTSFallback(word.hanzi);
    }
  };

  const speakTTSFallback = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    if (mandarinVoice) {
      utterance.voice = mandarinVoice;
    } else {
      utterance.lang = "zh-CN";
    }
    utterance.rate = 0.45;
    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(utterance);
  };

  // ─── Web Audio API Sound Feedback ──────────────────────────────────────────
  const playSoundFeedback = (isCorrect: boolean) => {
    if (typeof window === "undefined") return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isCorrect) {
        // Erfolgs-Chime (doppelter heller Ton)
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        // Fehler-Brummen (tiefer, rauer Sägezahn-Ton)
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.error("Audio-Synthese fehlgeschlagen:", e);
    }
  };

  // ─── Filter- & Startlogik ──────────────────────────────────────────────────
  const filteredWords = vocabList.filter(w =>
    selectedDifficulties.includes(w.difficulty || "easy")
  );

  const toggleDifficulty = (diff: "easy" | "medium" | "hard") => {
    setSelectedDifficulties((prev) => {
      if (prev.includes(diff)) {
        if (prev.length === 1) return prev; // Mindestens ein Schwierigkeitsgrad muss ausgewählt sein
        return prev.filter((d) => d !== diff);
      }
      return [...prev, diff];
    });
  };

  const handleStartPractice = () => {
    if (filteredWords.length < 10) return;

    // Autoplay unlock for Speech Synthesis and Audio (triggered directly by user gesture click)
    if (typeof window !== "undefined") {
      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
        }
        const audio = new Audio();
        audio.play().catch(() => {});
      } catch (e) {
        console.error("Autoplay unlock failed", e);
      }
    }

    // Shuffle und auf gewählte Anzahl beschränken
    const shuffledPool = [...filteredWords].sort(() => Math.random() - 0.5);
    const count = Math.min(questionCount, shuffledPool.length);
    const selectedPool = shuffledPool.slice(0, count);

    // Fragen generieren
    const generatedQuestions: Question[] = selectedPool.map((word) => {
      // Prüfen, ob Ton-Distraktoren generiert werden können
      const toneDistractors = getToneDistractors(word.pinyin);
      const isToneEligible = toneDistractors.length === 3;

      // 50% Wahrscheinlichkeit für eine Ton-Übungsfrage, falls möglich
      const useToneQuestion = isToneEligible && Math.random() < 0.5;

      if (useToneQuestion) {
        const choices = [word.pinyin, ...toneDistractors].sort(() => Math.random() - 0.5);
        return {
          word,
          choices,
          selectedChoice: null,
          isCorrect: null,
          type: "tone"
        };
      } else {
        // Standard-Übungsfrage (unterschiedliche Wörter)
        const otherWords = vocabList.filter(w => w.id !== word.id && w.pinyin !== word.pinyin);
        const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5);
        
        const choicesSet = new Set<string>();
        choicesSet.add(word.pinyin);

        for (const other of shuffledOthers) {
          if (choicesSet.size >= 4) break;
          choicesSet.add(other.pinyin);
        }

        // Fallback falls nicht genug Wörter vorhanden sind
        let fallbackIndex = 1;
        while (choicesSet.size < 4) {
          choicesSet.add(`Distraktor ${fallbackIndex++}`);
        }

        const choices = Array.from(choicesSet).sort(() => Math.random() - 0.5);

        return {
          word,
          choices,
          selectedChoice: null,
          isCorrect: null,
          type: "standard"
        };
      }
    });

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setScreen("play");

    // Erste Aussprache nach kurzer Verzögerung abspielen
    setTimeout(() => {
      playWordAudio(generatedQuestions[0].word);
    }, 400);
  };

  // ─── Game Loop Handlers ────────────────────────────────────────────────────
  const handleSelectChoice = (choice: string) => {
    const currentQ = questions[currentIndex];
    if (currentQ.selectedChoice !== null) return; // Bereits beantwortet

    const isCorrect = choice === currentQ.word.pinyin;
    playSoundFeedback(isCorrect);

    setQuestions(prev => prev.map((q, idx) =>
      idx === currentIndex
        ? { ...q, selectedChoice: choice, isCorrect }
        : q
    ));

    // Lernerfolg im Offline-Kalender eintragen
    trackPractice(currentQ.word.id).catch((err) => {
      console.error("Fehler beim Speichern der Übungsaktivität im Kalender:", err);
    });
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      // Nächstes Wort abspielen
      setTimeout(() => {
        playWordAudio(questions[currentIndex + 1].word);
      }, 300);
    } else {
      // Ergebnis der Hörübung speichern
      const finalCorrect = questions.filter(q => q.isCorrect).length;
      const finalTotal = questions.length;
      saveListeningSessionResult(finalCorrect, finalTotal).catch((err) => {
        console.error("Fehler beim Speichern des Hörübungsergebnisses:", err);
      });
      setScreen("score");
    }
  };

  // ─── Stats für Auswertung ──────────────────────────────────────────────────
  const correctCount = questions.filter(q => q.isCorrect).length;
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Lade Lernmodus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 flex items-start md:items-center justify-center relative overflow-hidden">
      {/* Soft radial background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 my-4">
        
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SCREEN: Configuration                                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {screen === "config" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <Link
                href="/student"
                className="p-2 hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Hören üben
              </h1>
            </div>

            <p className="text-neutral-400 text-sm leading-relaxed">
              Verbessere dein Hörverstehen! Höre dir die Vokabel an und ordne ihr das richtige Pinyin zu.
            </p>

            {/* 1. Schwierigkeitsgrad wählen */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider block">
                1. Stufen wählen (mehrere möglich)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map((diff) => {
                  const isActive = selectedDifficulties.includes(diff);
                  let badgeColor = "";
                  if (diff === "easy") {
                    badgeColor = isActive 
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold" 
                      : "bg-neutral-950 border-neutral-850 text-neutral-500 border-neutral-800 hover:text-white";
                  } else if (diff === "medium") {
                    badgeColor = isActive 
                      ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold" 
                      : "bg-neutral-950 border-neutral-850 text-neutral-500 border-neutral-800 hover:text-white";
                  } else {
                    badgeColor = isActive 
                      ? "bg-red-500/15 border-red-500 text-red-400 font-bold" 
                      : "bg-neutral-950 border-neutral-850 text-neutral-500 border-neutral-800 hover:text-white";
                  }

                  const labels = { easy: "Einfach", medium: "Mittel", hard: "Schwer" };

                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => toggleDifficulty(diff)}
                      className={`p-3 rounded-2xl border text-center text-xs transition-all duration-200 cursor-pointer ${badgeColor}`}
                    >
                      {labels[diff]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Box: Verfügbare Wörter */}
            <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl flex items-center justify-between text-sm">
              <span className="text-neutral-400">Verfügbare Wörter für diese Auswahl:</span>
              <span className="font-extrabold text-amber-400 text-base">{filteredWords.length}</span>
            </div>

            {/* 2. Anzahl der Fragen wählen */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-neutral-300 uppercase tracking-wider block">
                2. Anzahl der Übungen
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([10, 20, 50] as const).map((count) => {
                  const isSelectable = filteredWords.length >= count;
                  const isSelected = questionCount === count;

                  let borderClass = "";
                  if (!isSelectable) {
                    borderClass = "opacity-30 cursor-not-allowed bg-neutral-950/50 border-neutral-850 text-neutral-600";
                  } else {
                    borderClass = isSelected
                      ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                      : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white border-neutral-800";
                  }

                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!isSelectable}
                      onClick={() => setQuestionCount(count)}
                      className={`p-3 rounded-2xl border text-center text-sm transition-all duration-200 cursor-pointer ${borderClass}`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message if not enough words */}
            {filteredWords.length < 10 && (
              <div className="p-4 bg-red-950/30 border border-red-800/40 text-red-200 rounded-2xl text-xs leading-normal">
                ⚠️ Du hast für deine Auswahl erst **{filteredWords.length}** Wörter angelegt. Du benötigst mindestens **10 Wörter**, um diesen Modus freizuschalten. Erstelle bitte mehr Vokabeln oder wähle weitere Schwierigkeitsstufen aus.
              </div>
            )}

            {/* Start Button */}
            <Button
              type="button"
              variant="primary"
              disabled={filteredWords.length < 10}
              onClick={handleStartPractice}
              className={`w-full py-4 text-base font-bold shadow-lg shadow-amber-500/10 bg-amber-500 hover:bg-amber-600 ${
                filteredWords.length < 10 ? "opacity-50" : ""
              }`}
            >
              Übung starten
            </Button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SCREEN: Play                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {screen === "play" && questions.length > 0 && (
          <div className="space-y-6">
            {/* Top Bar: Progress and exit button */}
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Wort {currentIndex + 1} von {questions.length}
              </span>
              <button
                onClick={() => {
                  if (confirm("Möchtest du die Übung wirklich abbrechen? Dein Fortschritt geht verloren.")) {
                    setScreen("config");
                  }
                }}
                className="text-xs font-semibold text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Type Hint Badge */}
            <div className="flex justify-center -mt-2">
              {questions[currentIndex].type === "tone" ? (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1.5 animate-pulse">
                  <Sparkles size={10} className="text-amber-400" />
                  Fokus: Töne bestimmen
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400 border border-neutral-700/50">
                  Fokus: Wort finden
                </span>
              )}
            </div>

            {/* Audio Play Button Area */}
            <div className="flex flex-col items-center justify-center py-10 bg-neutral-950/40 border border-neutral-850 rounded-3xl space-y-4">
              <button
                type="button"
                onClick={() => playWordAudio(questions[currentIndex].word)}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-xl ${
                  isPlayingAudio
                    ? "bg-amber-500 text-white animate-pulse"
                    : "bg-neutral-900 border border-neutral-800 text-amber-400 hover:bg-neutral-800 hover:text-amber-300 shadow-amber-500/5"
                }`}
              >
                <Volume2 size={40} className={isPlayingAudio ? "animate-bounce" : ""} />
              </button>
              <div className="text-center">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Aussprache hören</p>
                <p className="text-[10px] text-neutral-600 mt-1">Hier klicken zum Wiederholen</p>
              </div>
            </div>

            {/* Choices Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {questions[currentIndex].choices.map((choice, i) => {
                const currentQ = questions[currentIndex];
                const isAnswered = currentQ.selectedChoice !== null;
                const isCurrentChoice = currentQ.selectedChoice === choice;
                const isCorrectChoice = choice === currentQ.word.pinyin;

                let buttonClass = "";
                let icon = null;

                if (!isAnswered) {
                  buttonClass = "bg-neutral-950 hover:bg-neutral-850 border-neutral-800 text-neutral-200 hover:border-neutral-700 active:scale-98";
                } else {
                  if (isCorrectChoice) {
                    buttonClass = "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold";
                    icon = <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-500/10" />;
                  } else if (isCurrentChoice) {
                    buttonClass = "bg-red-500/10 border-red-500 text-red-400 font-bold";
                    icon = <XCircle size={16} className="text-red-400 fill-red-500/10" />;
                  } else {
                    buttonClass = "bg-neutral-950/20 border-neutral-900 text-neutral-600 opacity-60";
                  }
                }

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isAnswered}
                    onClick={() => handleSelectChoice(choice)}
                    className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all duration-300 font-mono text-base ${buttonClass}`}
                  >
                    <span>{choice}</span>
                    {icon}
                  </button>
                );
              })}
            </div>

            {/* Next Button Section */}
            {questions[currentIndex].selectedChoice !== null && (
              <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleNext}
                  className="w-full py-4 text-base font-bold bg-neutral-800 border border-neutral-700 hover:bg-neutral-750 text-white shadow-md cursor-pointer"
                >
                  {currentIndex + 1 === questions.length ? "Ergebnis anzeigen" : "Nächstes Wort"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SCREEN: Score / Summary                                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {screen === "score" && (
          <div className="space-y-6">
            {/* Header / Premium Award Display */}
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-400 relative">
                <Award size={36} />
                <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Übung abgeschlossen!
                </h1>
                <p className="text-neutral-500 text-xs mt-1">Hörverstehen-Zusammenfassung</p>
              </div>
            </div>

            {/* Score Ring Display */}
            <div className="p-6 bg-neutral-950/40 border border-neutral-850 rounded-3xl flex flex-col items-center justify-center space-y-2">
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Deine Auswertung</span>
              <span className="text-4xl font-black text-amber-400">
                {correctCount} / {questions.length}
              </span>
              <span className="text-sm text-neutral-500 font-semibold">
                ({scorePercent}% richtig beantwortet)
              </span>
            </div>

            {/* Answers List */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Detailübersicht</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-sm ${
                      q.isCorrect
                        ? "bg-emerald-500/5 border-emerald-950/50"
                        : "bg-red-500/5 border-red-950/50"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-neutral-200">{q.word.hanzi}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider ${
                          q.word.difficulty === 'easy'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : q.word.difficulty === 'medium'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {q.word.difficulty === 'easy' ? 'Einfach' : q.word.difficulty === 'medium' ? 'Mittel' : 'Schwer'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 font-mono">
                        Pinyin: <span className="text-neutral-300 font-bold">{q.word.pinyin}</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 italic">Bedeutung: {q.word.germanMeaning}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!q.isCorrect && (
                        <span className="text-xs font-mono text-neutral-500 line-through truncate max-w-24">
                          {q.selectedChoice}
                        </span>
                      )}
                      {q.isCorrect ? (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                          ✓
                        </span>
                      ) : (
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                          ✕
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setScreen("config")}
                className="flex-1 py-3.5"
              >
                <RotateCcw size={16} />
                Nochmal
              </Button>
              <Link href="/student" className="flex-1">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/5 cursor-pointer"
                >
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
