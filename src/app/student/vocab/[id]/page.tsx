export default function VocabularyPractice() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Practice</h1>
      </header>

      <div className="max-w-md mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center">
        <h2 className="text-6xl font-bold mb-4">谢谢</h2>
        <p className="text-2xl text-emerald-400 mb-2">xièxie</p>
        <p className="text-neutral-400 mb-8">Danke</p>

        <div className="space-y-4">
          <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors">
            Listen to Teacher
          </button>
          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors font-semibold">
            Record Pronunciation
          </button>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-2xl flex items-center justify-center gap-2 transition-colors font-semibold">
            Request Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
