"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Eye, EyeOff, Download, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { de } from "@/locales/de";
import { createClient } from "@/utils/supabase/client";
import { getVocabList, importVocab, Vocabulary } from "@/lib/db";
import { suggestPinyin, pinyinNumberToSymbol, pinyinSymbolToNumber } from "@/lib/pinyinConverter";

export default function StudentSettings() {
  const t = de.settings;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  // ─── CSV Backup States ───────────────────────────────────────────────────
  const [backupMessage, setBackupMessage] = useState("");
  const [backupIsError, setBackupIsError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to escape CSV values
  function escapeCSV(val: string | number | boolean | undefined | null): string {
    if (val === undefined || val === null) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  // Export vocabulary list to CSV file
  async function handleExportCSV() {
    setBackupMessage("");
    setBackupIsError(false);
    try {
      const list = await getVocabList();
      if (list.length === 0) {
        setBackupMessage("Du hast noch keine Vokabeln zum Exportieren.");
        setBackupIsError(true);
        return;
      }

      const headers = [
        "id",
        "hanzi",
        "pinyin",
        "pinyinNumber",
        "germanMeaning",
        "createdAt",
        "learned",
        "bestScore",
        "difficulty",
        "learnedAt",
        "lastPracticedAt",
        "teacherAudioId",
        "teacherAudioLocalPath"
      ];

      const csvRows = [headers.join(",")];

      for (const item of list) {
        const row = [
          escapeCSV(item.id),
          escapeCSV(item.hanzi),
          escapeCSV(item.pinyin),
          escapeCSV(item.pinyinNumber),
          escapeCSV(item.germanMeaning),
          escapeCSV(item.createdAt),
          escapeCSV(item.learned),
          escapeCSV(item.bestScore),
          escapeCSV(item.difficulty),
          escapeCSV(item.learnedAt),
          escapeCSV(item.lastPracticedAt),
          escapeCSV(item.teacherAudioId),
          escapeCSV(item.teacherAudioLocalPath)
        ];
        csvRows.push(row.join(","));
      }

      const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel compatibility
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ton-gpt-vokabeln-${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setBackupMessage(`Erfolgreich ${list.length} Vokabeln exportiert!`);
      setBackupIsError(false);
    } catch (err) {
      console.error(err);
      setBackupMessage("Fehler beim Exportieren der Vokabeln.");
      setBackupIsError(true);
    }
  }

  // Parse CSV row respecting double quotes
  function parseCSVRow(row: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(currentField);
        currentField = "";
      } else {
        currentField += char;
      }
    }
    fields.push(currentField);
    return fields;
  }

  // Parse whole CSV content
  function parseCSV(text: string): Record<string, string>[] {
    const cleanedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const lines: string[] = [];
    let currentLine = "";
    let inQuotes = false;

    for (let i = 0; i < cleanedText.length; i++) {
      const char = cleanedText[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if (char === "\n" && !inQuotes) {
        lines.push(currentLine);
        currentLine = "";
      } else {
        currentLine += char;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }

    if (lines.length <= 1) return [];

    const headers = parseCSVRow(lines[0]);
    const results: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const rowValues = parseCSVRow(lines[i]);
      if (rowValues.length === 0 || (rowValues.length === 1 && rowValues[0] === "")) continue;
      
      const obj: Record<string, string> = {};
      headers.forEach((header, index) => {
        const cleanHeader = header.replace(/^\uFEFF/, "").trim();
        obj[cleanHeader] = rowValues[index] || "";
      });
      results.push(obj);
    }

    return results;
  }

  // Import vocabulary list from CSV file
  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    setBackupMessage("");
    setBackupIsError(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseCSV(text);

        if (parsedRows.length === 0) {
          setBackupMessage("Die ausgewählte Datei enthält keine gültigen Vokabeln.");
          setBackupIsError(true);
          return;
        }

        // Get all existing vocabulary from DB
        const existingVocab = await getVocabList();

        // Parse CSV items into Vocabulary objects
        const csvVocabs: Vocabulary[] = [];
        for (const row of parsedRows) {
          if (!row.hanzi || !row.germanMeaning) continue;

          let finalPinyin = row.pinyin ? row.pinyin.trim() : "";
          let finalPinyinNumber = row.pinyinNumber ? row.pinyinNumber.trim() : "";

          if (!finalPinyin && !finalPinyinNumber) {
            const suggestions = suggestPinyin(row.hanzi.trim());
            finalPinyin = suggestions.pinyinSymbol;
            finalPinyinNumber = suggestions.pinyinNumber;
          } else if (finalPinyin && !finalPinyinNumber) {
            finalPinyinNumber = pinyinSymbolToNumber(finalPinyin);
          } else if (!finalPinyin && finalPinyinNumber) {
            finalPinyin = pinyinNumberToSymbol(finalPinyinNumber);
          }

          csvVocabs.push({
            id: row.id || crypto.randomUUID(),
            hanzi: row.hanzi.trim(),
            pinyin: finalPinyin,
            pinyinNumber: finalPinyinNumber,
            germanMeaning: row.germanMeaning.trim(),
            createdAt: row.createdAt || new Date().toISOString(),
            learned: row.learned === "true",
            bestScore: Number(row.bestScore) || 0,
            difficulty: (row.difficulty === "medium" || row.difficulty === "hard") ? row.difficulty : "easy",
            learnedAt: row.learnedAt || undefined,
            lastPracticedAt: row.lastPracticedAt || undefined,
            teacherAudioId: row.teacherAudioId || undefined,
            teacherAudioLocalPath: row.teacherAudioLocalPath || undefined,
          });
        }

        // Combine existing database items and new CSV items
        const combined = [...existingVocab, ...csvVocabs];

        // Group by Hanzi
        const groups = new Map<string, Vocabulary[]>();
        for (const item of combined) {
          const key = item.hanzi.trim();
          if (!groups.has(key)) {
            groups.set(key, []);
          }
          groups.get(key)!.push(item);
        }

        const toSave: Vocabulary[] = [];
        const toDeleteIds = new Set<string>();

        for (const [, items] of groups.entries()) {
          // Sort items by createdAt ascending (oldest first)
          items.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime();
            const timeB = new Date(b.createdAt).getTime();
            if (isNaN(timeA) && isNaN(timeB)) return 0;
            if (isNaN(timeA)) return 1;
            if (isNaN(timeB)) return -1;
            return timeA - timeB;
          });

          const oldest = items[0];
          toSave.push(oldest);

          // All other items with the same Hanzi are duplicates to be removed
          for (let i = 1; i < items.length; i++) {
            const duplicate = items[i];
            const isFromDB = existingVocab.some(v => v.id === duplicate.id);
            if (isFromDB && duplicate.id !== oldest.id) {
              toDeleteIds.add(duplicate.id);
            }
          }
        }

        // Delete duplicates from the database
        const { deleteVocabWithAudio } = await import("@/lib/db");
        for (const idToDelete of toDeleteIds) {
          await deleteVocabWithAudio(idToDelete);
        }

        // Save/Import the oldest versions to the database
        let importCount = 0;
        for (const vocab of toSave) {
          // Only save/update if it was in the incoming CSV (no need to update unchanged existing items)
          const isFromCSV = csvVocabs.some(v => v.id === vocab.id);
          if (isFromCSV) {
            await importVocab(vocab);
            importCount++;
          }
        }

        setBackupMessage(`Erfolgreich ${importCount} Vokabeln importiert (Duplikate bereinigt, älteste Einträge behalten)!`);
        setBackupIsError(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error(err);
        setBackupMessage("Fehler beim Lesen oder Einpflegen der CSV-Datei.");
        setBackupIsError(true);
      }
    };
    reader.onerror = () => {
      setBackupMessage("Fehler beim Lesen der Datei.");
      setBackupIsError(true);
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    // Validierung
    if (newPassword.length < 6) {
      setMessage(t.passwordTooShort);
      setIsError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage(t.passwordMismatch);
      setIsError(true);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      setMessage(t.passwordChanged);
      setIsError(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(t.passwordError);
      setIsError(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 md:p-6 relative overflow-hidden">
      {/* Dekorative Glows */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto relative z-10">

        {/* Header */}
        <header className="mb-8">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            {t.backToDashboard}
          </Link>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-teal-400 bg-clip-text text-transparent">
            {t.title}
          </h1>
        </header>

        {/* Passwort ändern */}
        <section className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Lock size={18} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-bold">{t.changePassword}</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">{t.newPassword}</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-11 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">{t.confirmPassword}</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 pr-11 text-white focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-xl text-center text-sm ${
                isError
                  ? "bg-red-500/20 text-red-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? de.admin.saving : t.saveBtn}
            </button>
          </form>
        </section>

        {/* Offline-Backup & Übertragung */}
        <section className="mt-6 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <Download size={18} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Daten-Backup & Übertragung</h2>
              <p className="text-neutral-500 text-xs mt-0.5">Vokabeln lokal sichern oder auf andere Geräte übertragen</p>
            </div>
          </div>

          <div className="p-4 bg-neutral-950/50 border border-neutral-850 rounded-xl space-y-2.5">
            <div className="flex gap-2 text-teal-400">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium leading-normal">
                Deine Vokabelkarten werden aus Datenschutzgründen rein lokal (offline) in diesem Browser gespeichert. Wenn du den Browser löschst oder das Gerät wechselst, gehen die Daten verloren.
              </p>
            </div>
            <p className="text-[10px] text-neutral-500 leading-normal">
              Nutze den CSV-Export, um deine Wörter herunterzuladen. Auf dem neuen Gerät kannst du die Datei hochladen, um deine Vokabelliste vollständig wiederherzustellen.
            </p>
          </div>

          {backupMessage && (
            <div className={`p-3 rounded-xl text-center text-xs flex items-center justify-center gap-2 font-medium ${
              backupIsError
                ? "bg-red-500/20 text-red-400 border border-red-900/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-900/40"
            }`}>
              {!backupIsError && <CheckCircle2 size={14} />}
              {backupMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Export */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 p-3 bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 rounded-xl text-xs font-bold text-neutral-200 hover:text-white transition-all active:scale-98 cursor-pointer"
            >
              <Download size={14} />
              Vokabeln exportieren (CSV)
            </button>

            {/* Import */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                id="csv-import-input"
              />
              <label
                htmlFor="csv-import-input"
                className="flex items-center justify-center gap-2 p-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/25 hover:border-teal-500/40 rounded-xl text-xs font-bold text-teal-400 transition-all active:scale-98 cursor-pointer text-center"
              >
                <Upload size={14} />
                Vokabeln importieren (CSV)
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
