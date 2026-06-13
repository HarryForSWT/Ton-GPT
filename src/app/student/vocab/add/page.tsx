"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X, Info } from "lucide-react";
import { addVocab } from "@/lib/db";
import { de } from "@/locales/de";
import { Button } from "@/components/ui/Button";
import { ToneHelper } from "@/components/ui/ToneHelper";

export default function AddVocabularyPage() {
  const router = useRouter();
  const t = de.vocabAdd;

  const [form, setForm] = useState({
    hanzi: "",
    pinyin: "",
    pinyinNumber: "",
    germanMeaning: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToneHelper, setShowToneHelper] = useState(false);

  // Ref to the pinyin input so we can insert at cursor position
  const pinyinRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  // Insert a tone-marked character at the current cursor position in the pinyin field
  const handleInsertToneChar = (char: string) => {
    const input = pinyinRef.current;
    if (!input) return;

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const currentValue = form.pinyin;
    const newValue = currentValue.substring(0, start) + char + currentValue.substring(end);

    setForm((prev) => ({ ...prev, pinyin: newValue }));
    if (error) setError("");

    // Restore focus and cursor position after React re-render
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { hanzi, pinyin, pinyinNumber, germanMeaning } = form;

    // Validation: hanzi + germanMeaning required; at least one pinyin form required
    if (!hanzi.trim() || !germanMeaning.trim() || (!pinyin.trim() && !pinyinNumber.trim())) {
      setError(t.errorRequired);
      return;
    }

    try {
      setLoading(true);
      await addVocab({
        hanzi: hanzi.trim(),
        pinyin: pinyin.trim(),
        pinyinNumber: pinyinNumber.trim(),
        germanMeaning: germanMeaning.trim(),
      });
      router.push("/student/vocab");
    } catch (err) {
      console.error(err);
      setError("Fehler beim Speichern der Vokabel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 flex items-start md:items-center justify-center">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-4">
        {/* Decorative glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/student/vocab"
            className="p-2 hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 text-red-200 rounded-2xl text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Hanzi — required */}
          <div className="space-y-2">
            <label htmlFor="hanzi" className="text-sm font-semibold text-neutral-300 block">
              {t.hanziLabel} <span className="text-emerald-500">*</span>
            </label>
            <input
              type="text"
              id="hanzi"
              name="hanzi"
              value={form.hanzi}
              onChange={handleChange}
              placeholder={t.hanziPlaceholder}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 text-white placeholder-neutral-600 transition-all outline-none text-2xl"
              disabled={loading}
            />
          </div>

          {/* Pinyin with tone marks — optional, with helper */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="pinyin" className="text-sm font-semibold text-neutral-300 block">
                {t.pinyinLabel}
              </label>
              <button
                type="button"
                onClick={() => setShowToneHelper((v) => !v)}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                  showToneHelper
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700"
                }`}
              >
                <span className="text-base leading-none">ā</span>
                Tonzeichen
              </button>
            </div>
            <input
              ref={pinyinRef}
              type="text"
              id="pinyin"
              name="pinyin"
              value={form.pinyin}
              onChange={handleChange}
              onFocus={() => setShowToneHelper(true)}
              placeholder={t.pinyinPlaceholder}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 text-white placeholder-neutral-600 transition-all outline-none"
              disabled={loading}
            />
            {/* Tone helper panel */}
            {showToneHelper && (
              <ToneHelper onInsert={handleInsertToneChar} />
            )}
          </div>

          {/* Pinyin with numbers — the easy way; at least one pinyin required */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="pinyinNumber" className="text-sm font-semibold text-neutral-300 block">
                {t.pinyinNumberLabel} <span className="text-emerald-500">*</span>
              </label>
              <div className="flex items-center gap-1 text-xs text-neutral-500">
                <Info size={11} />
                <span>{t.pinyinHint}</span>
              </div>
            </div>
            <input
              type="text"
              id="pinyinNumber"
              name="pinyinNumber"
              value={form.pinyinNumber}
              onChange={handleChange}
              placeholder={t.pinyinNumberPlaceholder}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 text-white placeholder-neutral-600 transition-all outline-none"
              disabled={loading}
            />
          </div>

          {/* German meaning — required */}
          <div className="space-y-2">
            <label htmlFor="germanMeaning" className="text-sm font-semibold text-neutral-300 block">
              {t.germanMeaningLabel} <span className="text-emerald-500">*</span>
            </label>
            <input
              type="text"
              id="germanMeaning"
              name="germanMeaning"
              value={form.germanMeaning}
              onChange={handleChange}
              placeholder={t.germanMeaningPlaceholder}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 text-white placeholder-neutral-600 transition-all outline-none"
              disabled={loading}
            />
          </div>

          {/* Required fields note */}
          <p className="text-xs text-neutral-600 flex items-center gap-1">
            <span className="text-emerald-500">*</span>
            Pflichtfeld — mindestens Pinyin mit Nummern oder Tonzeichen angeben
          </p>

          {/* Action buttons */}
          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/student/vocab")}
              disabled={loading}
              className="flex-1"
            >
              <X size={18} />
              {t.cancelBtn}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1 shadow-lg shadow-emerald-500/10"
            >
              <Save size={18} />
              {loading ? "Wird gespeichert..." : t.saveBtn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
