"use client";

import React, { useState, useEffect, useRef } from "react";
import { Volume2, AlertTriangle, Square } from "lucide-react";

interface MandarinTTSPlayerProps {
  text: string;
  pinyin?: string;
  className?: string;
}

export function MandarinTTSPlayer({ text, pinyin, className = "" }: MandarinTTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [hasCheckedVoices, setHasCheckedVoices] = useState(false);
  const [voicesError, setVoicesError] = useState(false);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Find the best Mandarin voice
  const findMandarinVoice = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const allVoices = window.speechSynthesis.getVoices();
    if (allVoices.length === 0) return;

    // Prefer zh-CN, zh-Hans, zh, then others like zh-HK, zh-TW
    const mandarinLocales = ["zh-CN", "zh-Hans", "zh"];
    
    // 1. Try exact match for preferred locales
    for (const locale of mandarinLocales) {
      const found = allVoices.find(v => v.lang.toLowerCase() === locale.toLowerCase() || v.lang.toLowerCase().replace('_', '-') === locale.toLowerCase());
      if (found) {
        setVoice(found);
        setVoicesError(false);
        setHasCheckedVoices(true);
        return;
      }
    }

    // 2. Try any language tag starting with zh
    const anyZh = allVoices.find(v => v.lang.toLowerCase().startsWith("zh"));
    if (anyZh) {
      setVoice(anyZh);
      setVoicesError(false);
      setHasCheckedVoices(true);
      return;
    }

    // No Mandarin voice found
    setVoice(null);
    setVoicesError(true);
    setHasCheckedVoices(true);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // SpeechSynthesis voices are loaded asynchronously in some browsers
    findMandarinVoice();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = findMandarinVoice;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlay = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    // Speak the text (Hanzi characters) directly so the browser's Chinese TTS engine pronounces it correctly
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    if (voice) {
      utterance.voice = voice;
    } else {
      // Direct browser fallback language
      utterance.lang = "zh-CN";
    }

    // Slow down speed for clear educational listening
    utterance.rate = 0.45;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className={`flex items-center justify-center gap-2 py-3 px-5 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-md ${
            isPlaying
              ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
              : "bg-blue-500/10 border border-blue-500/25 hover:bg-blue-500/20 text-blue-400 shadow-blue-500/5"
          }`}
        >
          {isPlaying ? (
            <>
              <Square size={16} className="fill-current" />
              <span>Stoppen</span>
            </>
          ) : (
            <>
              <Volume2 size={16} />
              <span>🔊 Standardaussprache (TTS)</span>
            </>
          )}
        </button>

      </div>

      {voicesError && hasCheckedVoices && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex gap-2.5 items-start text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <p>
            Keine chinesische Systemstimme auf deinem Gerät gefunden. Die Aussprache klingt möglicherweise fehlerhaft oder wird nicht abgespielt. Installiere ggf. die Sprachdaten für Mandarin (Chinesisch) in deinen Systemeinstellungen.
          </p>
        </div>
      )}
    </div>
  );
}
