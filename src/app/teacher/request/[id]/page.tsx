export default function ReviewRequest() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Review Pronunciation</h1>
      </header>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center">
          <p className="text-neutral-400 mb-2">Student is trying to say:</p>
          <h2 className="text-4xl font-bold mb-2">谢谢</h2>
          <p className="text-xl text-blue-400">xièxie</p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Student&apos;s Audio</h3>
          <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white p-4 rounded-xl transition-colors">
            Play Student Audio
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6">
          <h3 className="font-semibold mb-4">Your Feedback</h3>
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl transition-colors font-semibold mb-4">
            Record Teacher Audio
          </button>
          <textarea
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white placeholder-neutral-500 focus:border-blue-500 focus:outline-none transition-colors"
            placeholder="Add text comments here..."
            rows={3}
          ></textarea>
        </div>

        <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-2xl font-bold transition-colors">
          Send Feedback
        </button>
      </div>
    </div>
  );
}
