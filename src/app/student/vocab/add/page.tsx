"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X, Info, Camera } from "lucide-react";
import { addVocab } from "@/lib/db";
import { de } from "@/locales/de";
import { Button } from "@/components/ui/Button";
import { ToneHelper } from "@/components/ui/ToneHelper";
import { suggestPinyin, pinyinNumberToSymbol, pinyinSymbolToNumber, checkToneSandhi } from "@/lib/pinyinConverter";
import { useOcr } from "@/hooks/useOcr";

export default function AddVocabularyPage() {
  const router = useRouter();
  const t = de.vocabAdd;

  const [form, setForm] = useState({
    hanzi: "",
    pinyin: "",
    pinyinNumber: "",
    germanMeaning: "",
    difficulty: "easy" as "easy" | "medium" | "hard",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showToneHelper, setShowToneHelper] = useState(false);

  // Ref to the pinyin input so we can insert at cursor position
  const pinyinRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading: ocrLoading, recognizeText } = useOcr();

  // Compute Sandhi Warnings live
  const sandhiWarnings = checkToneSandhi(form.pinyin || form.pinyinNumber);

  const handleOcrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await recognizeText(file);
      if (text) {
        setForm((prev) => {
          const updated = { ...prev, hanzi: text };
          const suggestions = suggestPinyin(text);
          updated.pinyin = suggestions.pinyinSymbol;
          updated.pinyinNumber = suggestions.pinyinNumber;
          return updated;
        });
        if (error) setError("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Texterkennung fehlgeschlagen.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSuggestTranslation = async () => {
    if (!form.hanzi.trim()) return;
    try {
      setTranslating(true);
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(form.hanzi.trim())}&langpair=zh|de`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.responseData && json.responseData.translatedText) {
        let trans = json.responseData.translatedText.trim();
        if (trans.endsWith('.')) {
          trans = trans.slice(0, -1);
        }
        setForm((prev) => ({ ...prev, germanMeaning: trans }));
      }
    } catch (err) {
      console.error("Translation suggestion failed", err);
    } finally {
      setTranslating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      
      if (name === "hanzi") {
        const suggestions = suggestPinyin(value);
        updated.pinyin = suggestions.pinyinSymbol;
        updated.pinyinNumber = suggestions.pinyinNumber;
      } else if (name === "pinyin") {
        updated.pinyinNumber = pinyinSymbolToNumber(value);
      } else if (name === "pinyinNumber") {
        updated.pinyin = pinyinNumberToSymbol(value);
      }
      
      return updated;
    });

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

    setForm((prev) => ({
      ...prev,
      pinyin: newValue,
      pinyinNumber: pinyinSymbolToNumber(newValue),
    }));
    if (error) setError("");

    // Restore focus and cursor position after React re-render
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { hanzi, pinyin, pinyinNumber, germanMeaning, difficulty } = form;

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
        difficulty,
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
            <div className="relative flex items-center">
              <input
                type="text"
                id="hanzi"
                name="hanzi"
                value={form.hanzi}
                onChange={handleChange}
                placeholder={t.hanziPlaceholder}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl p-4 pr-16 text-white placeholder-neutral-600 transition-all outline-none text-2xl"
                disabled={loading || ocrLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                {ocrLoading ? (
                  <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mr-2" />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="p-2.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-850 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      title="Karteikarte fotografieren / OCR"
                    >
                      <Camera size={22} />
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleOcrFileChange}
                      className="hidden"
                    />
                  </>
                )}
              </div>
            </div>
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

          {/* Tone Sandhi live warning alert */}
          {sandhiWarnings.length > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-xs space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Info size={14} className="shrink-0" />
                <span>Aussprache-Hinweis (Ton-Sandhi):</span>
              </div>
              {sandhiWarnings.map((warn, idx) => (
                <p key={idx} className="leading-relaxed pl-5 relative">
                  <span className="absolute left-1.5 top-1.5 w-1 h-1 rounded-full bg-amber-400/70" />
                  {warn}
                </p>
              ))}
            </div>
          )}

          {/* German meaning — required */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="germanMeaning" className="text-sm font-semibold text-neutral-300 block">
                {t.germanMeaningLabel} <span className="text-emerald-500">*</span>
              </label>
              {form.hanzi.trim() && (
                <button
                  type="button"
                  onClick={handleSuggestTranslation}
                  disabled={translating || loading}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {translating ? (
                    <span className="w-3 h-3 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  ) : null}
                  Vorschlag laden
                </button>
              )}
            </div>
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

          {/* Schwierigkeitsgrad — required */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-neutral-300 block">
              Schwierigkeitsgrad <span className="text-emerald-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["easy", "medium", "hard"] as const).map((diff) => {
                const isActive = form.difficulty === diff;
                let colorClass = "";
                if (diff === "easy") {
                  colorClass = isActive
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                    : "bg-neutral-950 border-neutral-850 text-neutral-500 hover:text-white border-neutral-800";
                } else if (diff === "medium") {
                  colorClass = isActive
                    ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                    : "bg-neutral-950 border-neutral-850 text-neutral-500 hover:text-white border-neutral-800";
                } else {
                  colorClass = isActive
                    ? "bg-red-500/10 border-red-500 text-red-400 font-bold"
                    : "bg-neutral-950 border-neutral-850 text-neutral-500 hover:text-white border-neutral-800";
                }

                const labels = { easy: "Einfach", medium: "Mittel", hard: "Schwer" };

                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, difficulty: diff }))}
                    className={`p-3.5 rounded-2xl border text-center text-sm transition-all duration-200 cursor-pointer ${colorClass}`}
                    disabled={loading}
                  >
                    {labels[diff]}
                  </button>
                );
              })}
            </div>
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
              isLoading={loading}
              className="flex-1 shadow-lg shadow-emerald-500/10"
            >
              {!loading && <Save size={18} />}
              {loading ? "Speichert..." : t.saveBtn}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
