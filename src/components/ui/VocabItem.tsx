import React from 'react';

interface VocabItemProps {
  characters: string;
  pinyin: string;
  meaning: string;
  onClick?: () => void;
}

export function VocabItem({ characters, pinyin, meaning, onClick }: VocabItemProps) {
  return (
    <div
      onClick={onClick}
      className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex justify-between items-center hover:border-emerald-500 transition-colors cursor-pointer"
    >
      <div>
        <p className="text-2xl font-bold text-white">{characters}</p>
        <p className="text-neutral-400">{pinyin}</p>
      </div>
      <div className="text-right">
        <p className="text-white font-medium">{meaning}</p>
      </div>
    </div>
  );
}
