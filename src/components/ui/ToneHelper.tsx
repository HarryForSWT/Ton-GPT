"use client";

import React from "react";

// All tone-marked vowels organized by base vowel and tone (0=neutral, 1-4=tones)
const TONE_MAP: Record<string, string[]> = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

const TONE_LABELS = ["0", "1", "2", "3", "4"];
const TONE_COLORS = [
  "text-neutral-300",   // Ton 0 (neutral)
  "text-blue-300",      // Ton 1
  "text-green-300",     // Ton 2
  "text-yellow-300",    // Ton 3
  "text-red-300",       // Ton 4
];

interface ToneHelperProps {
  /** Called when the user clicks a tone-marked character */
  onInsert: (char: string) => void;
}

export function ToneHelper({ onInsert }: ToneHelperProps) {
  return (
    <div className="mt-2 p-3 bg-neutral-950/80 border border-neutral-700 rounded-2xl animate-in fade-in duration-200">
      {/* Header: Tone legend */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Tonzeichen
        </span>
        <div className="flex gap-2">
          {TONE_LABELS.map((label, i) => (
            <span key={label} className={`text-xs font-bold ${TONE_COLORS[i]}`}>
              {i === 0 ? "0" : i}
            </span>
          ))}
        </div>
      </div>

      {/* Vowel rows */}
      <div className="space-y-1.5">
        {Object.entries(TONE_MAP).map(([base, chars]) => (
          <div key={base} className="flex items-center gap-1.5">
            {/* Base vowel label */}
            <span className="text-xs text-neutral-500 w-3 shrink-0 font-mono">
              {base}
            </span>
            {/* Tone buttons */}
            <div className="flex gap-1 flex-1">
              {chars.map((char, toneIndex) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => onInsert(char)}
                  className={`
                    flex-1 py-1.5 rounded-lg text-sm font-bold transition-all
                    bg-neutral-800 hover:bg-neutral-700 active:scale-90
                    border border-neutral-700 hover:border-neutral-500
                    ${TONE_COLORS[toneIndex]}
                    min-w-0
                  `}
                  title={`Ton ${toneIndex}: ${char}`}
                >
                  {char}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Helpful shortcut tip */}
      <p className="text-xs text-neutral-600 mt-2 text-center">
        Tippen zum Einfügen an die Cursor-Position
      </p>
    </div>
  );
}
