"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { de } from "@/locales/de";
import { createClient } from "@/utils/supabase/client";

export default function StudentSettings() {
  const t = de.settings;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

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
      </div>
    </div>
  );
}
