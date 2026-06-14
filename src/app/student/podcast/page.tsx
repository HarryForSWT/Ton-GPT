"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Repeat, Headphones, Sliders } from "lucide-react";
import { getVocabList, Vocabulary, getAudioRecordingsByVocabId, getLocalDateString } from "@/lib/db";
import { Button } from "@/components/ui/Button";

type PlayPhase = "idle" | "chinese" | "pause" | "german" | "delay";

export default function VocabPodcastPage() {
  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [filteredList, setFilteredList] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Player States
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<PlayPhase>("idle");
  const [countdown, setCountdown] = useState(2); // Repeat pause timer
  
  // Settings
  const [filterType, setFilterType] = useState<"all" | "srs" | "hard" | "medium" | "easy">("all");
  const [repeatMode, setRepeatMode] = useState<"none" | "all" | "single">("all");
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [pauseDuration, setPauseDuration] = useState<number>(2.0); // pause in seconds between CN and DE

  // TTS Voices
  const [chineseVoice, setChineseVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [germanVoice, setGermanVoice] = useState<SpeechSynthesisVoice | null>(null);

  // References to handle playback timers and audio instances
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isPlayingRef = useRef(isPlaying);
  const sequenceIdRef = useRef(0);

  // Sync isPlayingRef with isPlaying state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // 1. Initial Load of Vocabulary & Voices
  useEffect(() => {
    getVocabList()
      .then((data) => {
        setVocabList(data);
        setFilteredList(data);
      })
      .catch((err) => console.error("Fehler beim Laden der Vokabeln:", err))
      .finally(() => setLoading(false));

    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        
        // Find Chinese voice
        const zhLocales = ["zh-cn", "zh-hans", "zh"];
        let zhVoice = voices.find(v => zhLocales.includes(v.lang.toLowerCase()));
        if (!zhVoice) zhVoice = voices.find(v => v.lang.toLowerCase().startsWith("zh"));
        setChineseVoice(zhVoice || null);

        // Find German voice
        const deLocales = ["de-de", "de"];
        let deVoice = voices.find(v => deLocales.includes(v.lang.toLowerCase()));
        if (!deVoice) deVoice = voices.find(v => v.lang.toLowerCase().startsWith("de"));
        setGermanVoice(deVoice || null);
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      stopAllPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Filter Handler
  useEffect(() => {
    let result = [...vocabList];
    if (filterType === "srs") {
      result = result.filter(v => getLocalDateString(v.nextReviewAt) <= getLocalDateString());
    } else if (filterType === "hard" || filterType === "medium" || filterType === "easy") {
      result = result.filter(v => v.difficulty === filterType);
    }
    setFilteredList(result);
    setCurrentIndex(0);
    setIsPlaying(false);
    setPhase("idle");
    stopAllPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, vocabList]);

  // 3. Main Player Loop Controller
  useEffect(() => {
    if (!isPlaying || filteredList.length === 0) return;

    // Start playback sequence for current index
    startSequence();

    return () => {
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentIndex, filteredList]);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stopAllPlayback = () => {
    setIsPlaying(false);
    setPhase("idle");
    sequenceIdRef.current++; // Invalidate any active sequence callbacks
    clearTimers();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  // Start sequence of the current word
  const startSequence = async () => {
    clearTimers();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const seqId = ++sequenceIdRef.current;
    const currentWord = filteredList[currentIndex];
    if (!currentWord) return;

    // Phase 1: Play Chinese
    setPhase("chinese");
    try {
      const recordings = await getAudioRecordingsByVocabId(currentWord.id);
      const teacherRecording = recordings.find(r => r.role === "teacher");

      if (teacherRecording && teacherRecording.blob) {
        const url = URL.createObjectURL(teacherRecording.blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
          triggerPausePhase(seqId);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
          speakChineseTTS(currentWord.hanzi, seqId);
        };
        await audio.play();
      } else {
        speakChineseTTS(currentWord.hanzi, seqId);
      }
    } catch {
      speakChineseTTS(currentWord.hanzi, seqId);
    }
  };

  const speakChineseTTS = (text: string, seqId: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      triggerPausePhase(seqId);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    if (chineseVoice) u.voice = chineseVoice;
    else u.lang = "zh-CN";
    
    u.rate = 0.6 * playbackSpeed;
    u.onend = () => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
      triggerPausePhase(seqId);
    };
    u.onerror = () => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
      triggerPausePhase(seqId);
    };
    activeUtteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  // Phase 2: Repeat Pause Countdown
  const triggerPausePhase = (seqId: number) => {
    setPhase("pause");
    setCountdown(pauseDuration);

    let timeLeft = pauseDuration;
    const intervalTime = 100; // tick every 100ms for smooth UI updates
    
    intervalRef.current = setInterval(() => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) {
        clearInterval(intervalRef.current!);
        return;
      }
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        clearInterval(intervalRef.current!);
        setCountdown(0);
        triggerGermanPhase(seqId);
      } else {
        setCountdown(Math.max(0, parseFloat(timeLeft.toFixed(1))));
      }
    }, intervalTime);
  };

  // Phase 3: German Translation
  const triggerGermanPhase = (seqId: number) => {
    setPhase("german");
    const currentWord = filteredList[currentIndex];
    if (!currentWord) return;

    if (typeof window === "undefined" || !window.speechSynthesis) {
      triggerDelayPhase(seqId);
      return;
    }

    const u = new SpeechSynthesisUtterance(currentWord.germanMeaning);
    if (germanVoice) u.voice = germanVoice;
    else u.lang = "de-DE";
    
    u.rate = 0.95 * playbackSpeed;
    u.onend = () => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
      triggerDelayPhase(seqId);
    };
    u.onerror = () => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
      triggerDelayPhase(seqId);
    };
    activeUtteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  // Phase 4: Delay before next word
  const triggerDelayPhase = (seqId: number) => {
    setPhase("delay");
    timeoutRef.current = setTimeout(() => {
      if (seqId !== sequenceIdRef.current || !isPlayingRef.current) return;
      handleNextWord();
    }, 1500 / playbackSpeed);
  };

  const handleNextWord = () => {
    if (repeatMode === "single") {
      // Re-trigger current word
      startSequence();
      return;
    }

    if (currentIndex + 1 < filteredList.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      if (repeatMode === "all") {
        setCurrentIndex(0);
      } else {
        // End of list, stop playback
        stopAllPlayback();
      }
    }
  };

  const handlePrevWord = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (repeatMode === "all") {
      setCurrentIndex(filteredList.length - 1);
    }
  };

  const togglePlay = () => {
    if (filteredList.length === 0) return;
    setIsPlaying(prev => !prev);
  };

  const currentWord = filteredList[currentIndex] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 flex items-start md:items-center justify-center relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 my-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/student/vocab"
              onClick={stopAllPlayback}
              className="p-2 hover:bg-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
                <Headphones size={20} className="text-purple-400" />
                Vokabel-Podcast
              </h1>
              <p className="text-neutral-500 text-xs mt-0.5">Automatisches Audio-Lernen</p>
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
            Autoplay
          </span>
        </div>

        {/* Empty State */}
        {vocabList.length === 0 ? (
          <div className="text-center py-12 bg-neutral-950/40 border border-dashed border-neutral-800 rounded-2xl p-6">
            <p className="text-neutral-400 text-sm mb-4">
              Du hast noch keine Vokabeln angelegt, die du im Podcast anhören könntest.
            </p>
            <Link href="/student/vocab/add">
              <Button type="button" variant="primary" className="bg-purple-600 hover:bg-purple-700">
                Wort hinzufügen
              </Button>
            </Link>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 bg-neutral-950/40 border border-neutral-850 rounded-2xl p-6 space-y-4">
            <p className="text-neutral-400 text-sm">
              Keine Vokabeln entsprechen dem gewählten Filter: <span className="font-bold text-white uppercase">{filterType}</span>.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => setFilterType("all")}
                className="text-xs bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 px-3 py-1.5 rounded-xl transition-all font-semibold"
              >
                Zurück zu allen Vokabeln
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Filter Pills */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block">
                Playlist filtern
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(["all", "srs", "easy", "medium", "hard"] as const).map((type) => {
                  const isActive = filterType === type;
                  let count = 0;
                  if (type === "all") count = vocabList.length;
                  else if (type === "srs") count = vocabList.filter(v => getLocalDateString(v.nextReviewAt) <= getLocalDateString()).length;
                  else count = vocabList.filter(v => v.difficulty === type).length;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isActive
                          ? "bg-purple-500/10 border-purple-500 text-purple-400"
                          : "bg-neutral-950 border-neutral-850 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {type === "all"
                        ? "Alle"
                        : type === "srs"
                          ? "Fällig (SRS)"
                          : type === "easy"
                            ? "Einfach"
                            : type === "medium"
                              ? "Mittel"
                              : "Schwer"}{" "}
                      <span className="opacity-60 font-normal">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Premium Vinyl Player Component */}
            <div className="bg-neutral-950/50 border border-neutral-850 rounded-3xl p-6 flex flex-col items-center justify-center space-y-6 min-h-[300px] relative overflow-hidden select-none">
              
              {/* Vinyl Disk Visualizer */}
              <div className="relative flex items-center justify-center">
                {/* Rotating Vinyl outer disk */}
                <div
                  className={`w-36 h-36 md:w-40 md:h-40 rounded-full bg-neutral-900 border-[6px] border-neutral-950 shadow-inner flex items-center justify-center relative transition-transform duration-1000 ${
                    isPlaying && phase === "chinese" ? "animate-spin" : isPlaying && phase === "german" ? "animate-spin [animation-duration:8s]" : ""
                  }`}
                  style={{
                    animationPlayState: isPlaying && (phase === "chinese" || phase === "german") ? "running" : "paused",
                    backgroundImage: `radial-gradient(circle, #262626 25%, #171717 30%, #171717 40%, #0a0a0a 45%, #262626 50%, #171717 65%, #0a0a0a 70%)`
                  }}
                >
                  {/* Center label */}
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-bold text-purple-300">
                    {currentWord ? currentWord.hanzi.charAt(0) : ""}
                  </div>
                </div>

                {/* Countdown overlay for pause repeat phase */}
                {phase === "pause" && (
                  <div className="absolute inset-0 bg-neutral-950/80 rounded-full flex flex-col items-center justify-center animate-fade-in border border-purple-500/40">
                    <span className="text-3xl font-black text-purple-400">{countdown}s</span>
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider mt-1">Nachsprechen</span>
                  </div>
                )}

                {/* Outer status pulses */}
                {isPlaying && phase === "chinese" && (
                  <div className="absolute -inset-1.5 border border-purple-500/20 rounded-full animate-ping pointer-events-none" />
                )}
                {isPlaying && phase === "german" && (
                  <div className="absolute -inset-1.5 border border-indigo-500/20 rounded-full animate-ping pointer-events-none" style={{ animationDelay: "0.5s" }} />
                )}
              </div>

              {/* Text Information container */}
              <div className="text-center space-y-1.5 max-w-xs">
                <div className="text-xs uppercase tracking-widest text-neutral-500 font-bold">
                  {phase === "chinese" && "Aussprache hören"}
                  {phase === "pause" && "Laut nachsprechen"}
                  {phase === "german" && "Bedeutung hören"}
                  {phase === "delay" && "Nächstes Wort..."}
                  {phase === "idle" && "Startbereit"}
                </div>
                <h2 className="text-3xl font-extrabold text-white tracking-wide">
                  {currentWord?.hanzi || ""}
                </h2>
                <div className="font-mono text-sm text-neutral-400">
                  {currentWord?.pinyin || ""}
                </div>
                
                {/* Reveal meaning depending on stage, or show faded if waiting */}
                <div className={`text-base font-semibold text-purple-300 transition-all duration-300 ${
                  phase === "german" || phase === "delay" || phase === "idle" ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}>
                  {currentWord?.germanMeaning || ""}
                </div>
              </div>

              {/* Progress Tracker text */}
              <div className="text-[10px] text-neutral-500 font-extrabold uppercase tracking-widest">
                Vokabel {currentIndex + 1} von {filteredList.length}
              </div>
            </div>

            {/* List Progress Slider */}
            <div className="space-y-1">
              <div className="h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-850">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / filteredList.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Music Controls Panel */}
            <div className="flex items-center justify-between px-2">
              {/* Loop/Repeat Settings */}
              <button
                type="button"
                onClick={() => {
                  setRepeatMode(prev => {
                    if (prev === "none") return "all";
                    if (prev === "all") return "single";
                    return "none";
                  });
                }}
                className={`p-2.5 rounded-xl transition-all relative ${
                  repeatMode !== "none" ? "bg-purple-500/10 text-purple-400" : "text-neutral-500 hover:text-white"
                }`}
                title={repeatMode === "single" ? "Einzelloop" : repeatMode === "all" ? "Gesamtloop" : "Kein Loop"}
              >
                <Repeat size={18} />
                {repeatMode === "single" && (
                  <span className="absolute bottom-1 right-1 text-[8px] bg-purple-500 text-white font-extrabold rounded-full w-3 h-3 flex items-center justify-center">1</span>
                )}
              </button>

              <div className="flex items-center gap-4">
                {/* Prev */}
                <button
                  type="button"
                  onClick={handlePrevWord}
                  className="p-3 bg-neutral-950 border border-neutral-850 text-neutral-300 hover:text-white rounded-2xl active:scale-95 transition-all"
                >
                  <SkipBack size={18} />
                </button>

                {/* Play/Pause Main Toggle */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-lg ${
                    isPlaying
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/15"
                      : "bg-white text-neutral-950 hover:bg-neutral-200 shadow-white/10"
                  }`}
                >
                  {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={() => {
                    if (currentIndex + 1 < filteredList.length) {
                      setCurrentIndex(prev => prev + 1);
                    } else if (repeatMode === "all") {
                      setCurrentIndex(0);
                    }
                  }}
                  className="p-3 bg-neutral-950 border border-neutral-850 text-neutral-300 hover:text-white rounded-2xl active:scale-95 transition-all"
                >
                  <SkipForward size={18} />
                </button>
              </div>

              {/* Reset to index 0 */}
              <button
                type="button"
                onClick={() => {
                  setCurrentIndex(0);
                  if (isPlaying) startSequence();
                }}
                className="p-2.5 text-neutral-500 hover:text-white rounded-xl transition-all"
                title="Wiedergabe von vorne starten"
              >
                <Sliders size={18} />
              </button>
            </div>

            {/* Adjustments Panel (Speed & Pause Duration) */}
            <div className="p-4 bg-neutral-950/30 border border-neutral-850 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Player-Einstellungen</h3>
              
              {/* Playback speed slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Sprechgeschwindigkeit:</span>
                  <span className="font-mono font-bold text-purple-400">{playbackSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              {/* Pause duration slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span>Pause zum Nachsprechen:</span>
                  <span className="font-mono font-bold text-purple-400">{pauseDuration.toFixed(1)} Sekunden</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.5"
                  value={pauseDuration}
                  onChange={(e) => setPauseDuration(parseFloat(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
