"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Volume2, Move } from "lucide-react";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Decorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto relative z-10 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/student"
              className="p-2 hover:bg-neutral-900 border border-transparent hover:border-neutral-800 rounded-xl transition-all text-neutral-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
                Spiele & Mini-Games
              </h1>
              <p className="text-neutral-400 text-sm mt-0.5">Lerne chinesische Töne auf spielerische und interaktive Weise</p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Game 1: Hören & Zuordnen */}
          <Link
            href="/student/practice/listening"
            className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-amber-500/60 hover:bg-neutral-850/30 transition-all group duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Volume2 size={20} className="text-amber-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">
                Hören & Zuordnen
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Höre dir die Aussprache einer Vokabel an und ordne ihr das richtige Pinyin zu. Enthält Standardfragen sowie anspruchsvolle Ton-Varianten.
              </p>
            </div>
            <div className="mt-6 text-xs font-semibold text-amber-400 flex items-center gap-1 group-hover:underline">
              Jetzt spielen &rarr;
            </div>
          </Link>

          {/* Game 2: Töne wischen */}
          <Link
            href="/student/practice/swipe"
            className="p-6 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl hover:border-pink-500/60 hover:bg-neutral-850/30 transition-all group duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-4">
                <Move size={20} className="text-pink-400" />
              </div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-pink-400 transition-colors">
                Töne wischen (Swipe)
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Höre die Vokabel und wische Silbe für Silbe in die Richtung des Pinyin-Tons. Trainiert dein aktives Ton-Verständnis über Gesten!
              </p>
            </div>
            <div className="mt-6 text-xs font-semibold text-pink-400 flex items-center gap-1 group-hover:underline">
              Jetzt wischen &rarr;
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
