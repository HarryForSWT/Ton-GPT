"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Plus, CheckCircle, Circle, BookOpen, Trash2 } from "lucide-react";
import { getVocabList, deleteVocab, Vocabulary } from "@/lib/db";
import { de } from "@/locales/de";

export default function VocabularyListPage() {
  const t = de.vocabList;

  const [vocabList, setVocabList] = useState<Vocabulary[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "learned" | "unlearned">("all");

  useEffect(() => {
    setMounted(true);
    getVocabList().then((data) => {
      // Sort vocabulary by createdAt desc so newest words show first
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setVocabList(sorted);
    });
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Prevent navigating to detail page when clicking delete
    e.stopPropagation();
    
    if (confirm(de.vocabDetail.deleteConfirm)) {
      try {
        await deleteVocab(id);
        setVocabList((prev) => prev.filter((item) => item.id !== id));
      } catch (err) {
        console.error("Failed to delete vocabulary", err);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm">Lade Vokabeln...</p>
        </div>
      </div>
    );
  }

  // Filter logic
  const filteredVocab = vocabList.filter((item) => {
    const matchesSearch =
      item.hanzi.toLowerCase().includes(search.toLowerCase()) ||
      item.pinyin.toLowerCase().includes(search.toLowerCase()) ||
      item.pinyinNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.germanMeaning.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "learned" && item.learned) ||
      (filter === "unlearned" && !item.learned);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6 relative overflow-hidden">
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <header className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/student"
              className="p-1 hover:bg-neutral-900 rounded-lg text-neutral-400 hover:text-white transition-colors"
              title={t.backToDashboard}
            >
              <ArrowLeft size={20} />
            </Link>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Lokal
            </span>
          </div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-neutral-400 text-sm mt-1">{t.subtitle}</p>
        </div>
        <Link href="/student/vocab/add">
          <button className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white px-5 py-3 rounded-2xl transition-all font-semibold shadow-lg shadow-emerald-500/10 w-full md:w-auto">
            <Plus size={18} />
            {t.addWordBtn}
          </button>
        </Link>
      </header>

      {/* Search and Filters */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row gap-4 relative z-10">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-900/80 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-neutral-500 transition-all outline-none"
          />
        </div>
        <div className="flex bg-neutral-900/80 p-1 border border-neutral-800 rounded-2xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-neutral-800 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Alle ({vocabList.length})
          </button>
          <button
            onClick={() => setFilter("learned")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "learned"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t.learnedBadge} ({vocabList.filter((v) => v.learned).length})
          </button>
          <button
            onClick={() => setFilter("unlearned")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === "unlearned"
                ? "bg-teal-500/15 text-teal-400"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t.notLearnedBadge} ({vocabList.filter((v) => !v.learned).length})
          </button>
        </div>
      </div>

      {/* Vocab Items Grid */}
      <main className="max-w-4xl mx-auto relative z-10">
        {filteredVocab.length === 0 ? (
          <div className="text-center py-16 bg-neutral-900/30 border border-dashed border-neutral-800 rounded-3xl p-8 flex flex-col items-center justify-center">
            <BookOpen size={48} className="text-neutral-600 mb-4 animate-pulse" />
            <p className="text-neutral-400 mb-6 max-w-sm">{t.emptyState}</p>
            {vocabList.length === 0 && (
              <Link href="/student/vocab/add">
                <button className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2.5 rounded-xl transition-all font-semibold">
                  <Plus size={16} />
                  {t.addWordBtn}
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredVocab.map((item) => (
              <Link key={item.id} href={`/student/vocab/${item.id}`} className="group block">
                <div className="p-5 bg-neutral-900 border border-neutral-800/80 rounded-2xl flex justify-between items-center hover:border-emerald-500/60 hover:bg-neutral-800/40 transition-all shadow-md group-hover:shadow-emerald-500/5 duration-300">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl font-bold tracking-wide text-neutral-100 group-hover:text-emerald-400 transition-colors">
                        {item.hanzi}
                      </span>
                      {item.learned ? (
                        <CheckCircle size={16} className="text-emerald-400 fill-emerald-500/10 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-neutral-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-neutral-400 text-sm font-mono">
                      {item.pinyin} <span className="text-neutral-600">({item.pinyinNumber})</span>
                    </p>
                    <p className="text-neutral-300 text-sm font-medium pt-1 line-clamp-1">
                      {item.germanMeaning}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-2 text-neutral-600 hover:text-red-400 hover:bg-neutral-800/80 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title={de.vocabDetail.deleteBtn}
                    >
                      <Trash2 size={16} />
                    </button>
                    {item.bestScore > 0 && (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                        {item.bestScore}%
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
