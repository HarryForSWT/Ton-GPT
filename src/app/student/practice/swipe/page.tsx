"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, RotateCcw, Award, Sparkles } from "lucide-react";
import { getVocabList, Vocabulary, trackPractice, updateSRS, saveToneSessionResult } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { pinyinSymbolToNumber } from "@/lib/pinyinConverter";

type Screen = "config" | "play" | "score";

interface SyllableInfo {
  text: string;
  cleanText: string;
  tone: number; // 1, 2, 3, 4, or 5 (neutral)
}

interface Question {
  word: Vocabulary;
  syllables: SyllableInfo[];
  syllableAnswers: (number | null)[]; // student guesses per syllable
}



function getSyllablesInfo(pinyin: string): SyllableInfo[] {
  const normalized = pinyinSymbolToNumber(pinyin);
  const matches = normalized.toLowerCase().replace(/ü/g, 'v').match(/[a-z]+[0-5]/g) || [];
  
  return matches.map(m => {
    let tone = parseInt(m.slice(-1), 10);
    if (tone === 0) tone = 5; // Normalize 0 to 5
    const cleanText = m.slice(0, -1).replace(/v/g, 'ü');
    return {
      text: m,
      cleanText,
      tone: tone >= 1 && tone <= 5 ? tone : 5
    };
  });
}

export default function SwipeTonesPage() {
  const [screen, setScreen] = useState<Screen>("config");
  const [loading, setLoading] = useState(true);
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);

  // Config
  const [selectedDifficulties, setSelectedDifficulties] = useState<("easy" | "medium" | "hard")[]>(["easy"]);
  const [questionCount, setQuestionCount] = useState<10 | 20 | 50>(10);

  // Play States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSyllableIndex, setCurrentSyllableIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [mandarinVoice, setMandarinVoice] = useState<SpeechSynthesisVoice | null>(null);
  
  // Feedback States
  const [lastActionFeedback, setLastActionFeedback] = useState<"correct" | "incorrect" | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Touch Gesture References
  // Removed touchStartRef since gestures are replaced by buttons

  useEffect(() => {
    getVocabList()
      .then((list) => setVocabList(list))
      .catch((err) => console.error("Fehler beim Laden:", err))
      .finally(() => setLoading(false));

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const findVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        const mandarinLocales = ["zh-cn", "zh-hans", "zh"];
        let found = voices.find(v => mandarinLocales.includes(v.lang.toLowerCase()));
        if (!found) found = voices.find(v => v.lang.toLowerCase().startsWith("zh"));
        setMandarinVoice(found || null);
      };
      findVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = findVoice;
      }
    }

    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (activeAudioRef.current) activeAudioRef.current.pause();
    };
  }, [activeAudioRef]);

  // Keyboard Navigation Fallback
  useEffect(() => {
    if (screen !== "play" || questions.length === 0 || lastActionFeedback !== null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1" || e.key === "ArrowRight") handleInputTone(1);
      else if (e.key === "2" || e.key === "ArrowUp") handleInputTone(2);
      else if (e.key === "3" || e.key === "ArrowLeft") handleInputTone(3);
      else if (e.key === "4" || e.key === "ArrowDown") handleInputTone(4);
      else if (e.key === "5" || e.key === "0" || e.key === "Spacebar" || e.key === " ") handleInputTone(5);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, questions, currentIndex, currentSyllableIndex, lastActionFeedback]);

  // Audio Player
  const playWordAudio = async (word: Vocabulary) => {
    if (typeof window === "undefined") return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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
        };
        audio.onerror = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(url);
          speakTTS(word.hanzi);
        };
        await audio.play();
      } else {
        speakTTS(word.hanzi);
      }
    } catch {
      speakTTS(word.hanzi);
    }
  };

  const speakTTS = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    if (mandarinVoice) u.voice = mandarinVoice;
    else u.lang = "zh-CN";
    u.rate = 0.45;
    u.onstart = () => setIsPlayingAudio(true);
    u.onend = () => setIsPlayingAudio(false);
    u.onerror = () => setIsPlayingAudio(false);
    window.speechSynthesis.speak(u);
  };

  const playFeedbackSound = (correct: boolean) => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (correct) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      }
    } catch {/* ignore */}
  };

  // ─── GAME LOGIC ────────────────────────────────────────────────────────────
  const filteredWords = vocabList.filter(w =>
    selectedDifficulties.includes(w.difficulty || "easy")
  );

  const toggleDifficulty = (diff: "easy" | "medium" | "hard") => {
    setSelectedDifficulties(prev => {
      if (prev.includes(diff)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== diff);
      }
      return [...prev, diff];
    });
  };

  const handleStart = () => {
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

    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    const count = Math.min(questionCount, shuffled.length);
    const pool = shuffled.slice(0, count);

    const generated: Question[] = pool.map(word => {
      const syllables = getSyllablesInfo(word.pinyinNumber || word.pinyin);
      return {
        word,
        syllables,
        syllableAnswers: Array(syllables.length).fill(null)
      };
    });

    setQuestions(generated);
    setCurrentIndex(0);
    setCurrentSyllableIndex(0);
    setScreen("play");
    setLastActionFeedback(null);

    setTimeout(() => playWordAudio(pool[0]), 400);
  };

  // Gestenerfassung
  // Gestures are replaced by direct tapping buttons as requested

  // Tone Input Evaluator
  const handleInputTone = (selectedTone: number) => {
    if (lastActionFeedback !== null) return;

    const currentQ = questions[currentIndex];
    const currentSyl = currentQ.syllables[currentSyllableIndex];
    const correct = selectedTone === currentSyl.tone;

    playFeedbackSound(correct);
    setLastActionFeedback(correct ? "correct" : "incorrect");

    // Update answers
    setQuestions(prev => prev.map((q, qIdx) => {
      if (qIdx === currentIndex) {
        const answers = [...q.syllableAnswers];
        answers[currentSyllableIndex] = selectedTone;
        return { ...q, syllableAnswers: answers };
      }
      return q;
    }));

    // Pause briefly for animation visual feedback
    setTimeout(() => {
      setLastActionFeedback(null);
      
      if (currentSyllableIndex + 1 < currentQ.syllables.length) {
        // Move to next syllable
        setCurrentSyllableIndex(prev => prev + 1);
      } else {
        // Evaluate the whole word for SRS card progression
        const updatedAnswers = [...currentQ.syllableAnswers];
        updatedAnswers[currentSyllableIndex] = selectedTone;
        const allCorrect = updatedAnswers.every((ans, sIdx) => ans === currentQ.syllables[sIdx].tone);

        // Update SRS & Calendar
        updateSRS(currentQ.word.id, allCorrect).catch(err => console.error(err));
        trackPractice(currentQ.word.id).catch(err => console.error(err));

        if (currentIndex + 1 < questions.length) {
          // Move to next word
          setCurrentIndex(prev => prev + 1);
          setCurrentSyllableIndex(0);
          playWordAudio(questions[currentIndex + 1].word);
        } else {
          // Calculate stats for session progress tracking
          let totalSyl = 0;
          let correctSyl = 0;
          
          questions.forEach((q, qIdx) => {
            q.syllables.forEach((s, sIdx) => {
              totalSyl++;
              const isCurrent = qIdx === currentIndex && sIdx === currentSyllableIndex;
              const ans = isCurrent ? selectedTone : q.syllableAnswers[sIdx];
              if (ans === s.tone) {
                correctSyl++;
              }
            });
          });

          saveToneSessionResult(correctSyl, totalSyl).catch((err) => console.error(err));

          // Complete game
          setScreen("score");
        }
      }
    }, 900);
  };

  // Score Screen Calculations
  const getGameStats = () => {
    let totalSyllables = 0;
    let correctSyllables = 0;
    let perfectWords = 0;

    questions.forEach(q => {
      let wordPerfect = true;
      q.syllables.forEach((s, idx) => {
        totalSyllables++;
        if (q.syllableAnswers[idx] === s.tone) {
          correctSyllables++;
        } else {
          wordPerfect = false;
        }
      });
      if (wordPerfect) perfectWords++;
    });

    const percent = totalSyllables > 0 ? Math.round((correctSyllables / totalSyllables) * 100) : 0;
    return { totalSyllables, correctSyllables, perfectWords, percent };
  };

  const { totalSyllables, correctSyllables, perfectWords, percent } = getGameStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 flex items-start md:items-center justify-center relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 my-4">
        
        {/* CONFIG SCREEN */}
        {screen === "config" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Link
                href="/student/games"
                className="p-2 hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-white"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                Töne wischen
              </h1>
            </div>

            <p className="text-neutral-400 text-sm leading-relaxed">
              Trainiere dein aktives Ton-Gespür! Höre das Wort und wische in die Richtung des Tons (oder nutze die Pfeiltasten/Kompass-Buttons).
            </p>

            {/* 1. Stufen wählen */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                1. Stufen wählen
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["easy", "medium", "hard"] as const).map(diff => {
                  const active = selectedDifficulties.includes(diff);
                  let badgeColor = "";
                  if (diff === "easy") {
                    badgeColor = active ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold" : "bg-neutral-950 border-neutral-850 text-neutral-500";
                  } else if (diff === "medium") {
                    badgeColor = active ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold" : "bg-neutral-950 border-neutral-850 text-neutral-500";
                  } else {
                    badgeColor = active ? "bg-red-500/15 border-red-500 text-red-400 font-bold" : "bg-neutral-950 border-neutral-850 text-neutral-500";
                  }
                  return (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => toggleDifficulty(diff)}
                      className={`p-3 rounded-2xl border text-center text-xs transition-all duration-200 cursor-pointer ${badgeColor}`}
                    >
                      {diff === "easy" ? "Einfach" : diff === "medium" ? "Mittel" : "Schwer"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-neutral-950/40 border border-neutral-850 rounded-2xl flex items-center justify-between text-sm">
              <span className="text-neutral-400">Verfügbare Wörter:</span>
              <span className="font-extrabold text-pink-400 text-base">{filteredWords.length}</span>
            </div>

            {/* 2. Anzahl Fragen */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                2. Anzahl Übungen
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([10, 20, 50] as const).map(count => {
                  const selectable = filteredWords.length >= count;
                  const selected = questionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={!selectable}
                      onClick={() => setQuestionCount(count)}
                      className={`p-3 rounded-2xl border text-center text-sm transition-all duration-200 ${
                        !selectable
                          ? "opacity-35 cursor-not-allowed bg-neutral-950/50 border-neutral-850 text-neutral-600"
                          : selected
                            ? "bg-pink-500/10 border-pink-500 text-pink-400 font-bold"
                            : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {count}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredWords.length < 10 && (
              <div className="p-4 bg-red-950/30 border border-red-800/40 text-red-200 rounded-2xl text-xs">
                ⚠️ Du hast für deine Auswahl erst **{filteredWords.length}** Wörter angelegt. Du benötigst mindestens **10 Wörter**, um die Töne-Wischübung freizuschalten.
              </div>
            )}

            <Button
              type="button"
              variant="primary"
              disabled={filteredWords.length < 10}
              onClick={handleStart}
              className={`w-full py-4 bg-pink-500 hover:bg-pink-600 font-bold shadow-lg shadow-pink-500/10`}
            >
              Spiel starten
            </Button>
          </div>
        )}

        {/* PLAY SCREEN */}
        {screen === "play" && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Wort {currentIndex + 1} von {questions.length}
              </span>
              <button
                onClick={() => {
                  if (confirm("Möchtest du das Spiel abbrechen?")) setScreen("config");
                }}
                className="text-xs font-semibold text-neutral-500 hover:text-white"
              >
                Abbrechen
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Visual Word Card (Touch Target) */}
            <div
              className={`relative py-8 bg-neutral-950/40 border rounded-3xl flex flex-col items-center justify-center space-y-5 select-none transition-all duration-300 min-h-52 ${
                lastActionFeedback === "correct"
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : lastActionFeedback === "incorrect"
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-neutral-850"
              }`}
            >
              {/* Hanzi */}
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-wide text-white text-center px-4 break-all">
                {questions[currentIndex].word.hanzi}
              </h2>

              {/* Syllables list */}
              <div className="flex flex-wrap gap-2 justify-center px-4 w-full">
                {questions[currentIndex].syllables.map((syl, sIdx) => {
                  const isActive = sIdx === currentSyllableIndex;
                  const answer = questions[currentIndex].syllableAnswers[sIdx];
                  const hasAnswered = answer !== null;
                  const isAnswerCorrect = answer === syl.tone;

                  return (
                    <div
                      key={sIdx}
                      className={`px-4 py-2 rounded-xl text-center border font-mono transition-all duration-200 ${
                        isActive
                          ? "border-pink-500 bg-pink-500/10 text-white font-extrabold scale-105 animate-pulse"
                          : hasAnswered
                            ? isAnswerCorrect
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                              : "border-red-500/40 bg-red-500/10 text-red-400"
                            : "border-neutral-800 bg-neutral-900/60 text-neutral-500"
                      }`}
                    >
                      <span className="text-lg font-bold">{syl.cleanText}</span>
                      {hasAnswered && (
                        <span className="text-[10px] block opacity-85 mt-0.5">
                          {isAnswerCorrect 
                            ? (syl.tone === 5 ? "Neutral" : `Ton ${syl.tone}`) 
                            : `Falsch (${answer === 5 ? "N" : answer})`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Audio Play Trigger */}
              <button
                type="button"
                onClick={() => playWordAudio(questions[currentIndex].word)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isPlayingAudio ? "bg-pink-500 text-white animate-pulse" : "bg-neutral-900 border border-neutral-800 text-pink-400 hover:bg-neutral-850"
                }`}
              >
                <Volume2 size={24} />
              </button>
            </div>

            {/* Tone Selector Buttons */}
            <div className="grid grid-cols-5 gap-1 md:gap-2.5 max-w-md mx-auto py-6 select-none">
              <button
                type="button"
                onClick={() => handleInputTone(1)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:border-pink-500/30 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-neutral-300"
              >
                <span className="text-xl md:text-2xl font-black text-pink-400 leading-none">ˉ</span>
                <span className="text-[9px] md:text-[10px] font-bold mt-1.5 whitespace-nowrap">1. Ton</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputTone(2)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:border-pink-500/30 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-neutral-300"
              >
                <span className="text-xl md:text-2xl font-black text-pink-400 leading-none">ˊ</span>
                <span className="text-[9px] md:text-[10px] font-bold mt-1.5 whitespace-nowrap">2. Ton</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputTone(3)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:border-pink-500/30 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-neutral-300"
              >
                <span className="text-xl md:text-2xl font-black text-pink-400 leading-none">ˇ</span>
                <span className="text-[9px] md:text-[10px] font-bold mt-1.5 whitespace-nowrap">3. Ton</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputTone(4)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:border-pink-500/30 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-neutral-300"
              >
                <span className="text-xl md:text-2xl font-black text-pink-400 leading-none">ˋ</span>
                <span className="text-[9px] md:text-[10px] font-bold mt-1.5 whitespace-nowrap">4. Ton</span>
              </button>

              <button
                type="button"
                onClick={() => handleInputTone(5)}
                className="p-3 rounded-2xl bg-neutral-950 border border-neutral-850 hover:bg-neutral-800 hover:border-pink-500/30 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all text-neutral-300"
              >
                <span className="text-xl md:text-2xl font-black text-pink-400 leading-none">˙</span>
                <span className="text-[9px] md:text-[10px] font-bold mt-1.5 whitespace-nowrap">Neutral</span>
              </button>
            </div>

            <p className="text-[10px] text-neutral-600 text-center uppercase tracking-wider leading-relaxed">
              Tipp: Nutze die Tasten 1, 2, 3, 4 oder 5 (Leertaste) auf der Tastatur!
            </p>
          </div>
        )}

        {/* SCORE SCREEN */}
        {screen === "score" && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3 py-4">
              <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/35 flex items-center justify-center text-pink-400 relative">
                <Award size={36} />
                <Sparkles size={16} className="absolute -top-1 -right-1 text-pink-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                  Töne erfolgreich gewischt!
                </h1>
                <p className="text-neutral-500 text-xs mt-1">Auswertung der Wisch-Statistiken</p>
              </div>
            </div>

            {/* Score ring */}
            <div className="p-6 bg-neutral-950/40 border border-neutral-850 rounded-3xl flex flex-col items-center justify-center space-y-2 text-center">
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-widest">Bestimmte Silben</span>
              <span className="text-4xl font-black text-pink-400">
                {correctSyllables} / {totalSyllables} richtig
              </span>
              <span className="text-sm text-neutral-500 font-semibold">
                ({percent}% Trefferquote — {perfectWords} fehlerfreie Wörter)
              </span>
            </div>

            {/* Detail View */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Detailübersicht</h3>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const wordPerfect = q.syllables.every((s, sIdx) => q.syllableAnswers[sIdx] === s.tone);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-sm ${
                        wordPerfect
                          ? "bg-emerald-500/5 border-emerald-950/50"
                          : "bg-red-500/5 border-red-950/50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-neutral-200">{q.word.hanzi}</span>
                          <span className="text-[10px] text-neutral-400 font-mono font-bold">({q.word.pinyin})</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">Bedeutung: {q.word.germanMeaning}</p>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        {q.syllables.map((syl, sIdx) => {
                          const ans = q.syllableAnswers[sIdx];
                          const correct = ans === syl.tone;
                          return (
                            <span
                              key={sIdx}
                              className={`px-1.5 py-0.5 rounded font-extrabold ${
                                correct ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                              }`}
                              title={`Gesucht: ${syl.tone === 5 ? "Neutral" : syl.tone}, Deine Auswahl: ${ans === 5 ? "Neutral" : ans}`}
                            >
                              T{syl.tone === 5 ? "N" : syl.tone}:{correct ? "✓" : `✗(${ans === 5 ? "N" : ans})`}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
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
                  className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 shadow-md shadow-pink-500/5 cursor-pointer"
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
