import Link from "next/link";

export default function VocabularyList() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Vocabulary</h1>
          <p className="text-neutral-400 mt-2">Manage your Mandarin words</p>
        </div>
        <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-colors font-medium">
          + Add Word
        </button>
      </header>

      <div className="space-y-4">
        {/* Placeholder vocab item */}
        <Link href="/student/vocab/1" className="block">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex justify-between items-center hover:border-emerald-500 transition-colors">
            <div>
              <p className="text-2xl font-bold">谢谢</p>
              <p className="text-neutral-400">xièxie (xie4 xie0)</p>
            </div>
            <div className="text-right">
              <p className="text-white">Danke</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
