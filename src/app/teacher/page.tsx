import Link from "next/link";

export default function TeacherDashboard() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Teacher Dashboard
        </h1>
        <p className="text-neutral-400 mt-2">Manage student pronunciation requests</p>
      </header>

      <div className="space-y-4">
        {/* Placeholder request item */}
        <Link href="/teacher/request/1" className="block">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl flex justify-between items-center hover:border-blue-500 transition-colors">
            <div>
              <p className="text-xl font-bold">Student Name</p>
              <p className="text-neutral-400">Word: 谢谢 (xièxie)</p>
            </div>
            <div className="text-right">
              <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-medium">
                New Request
              </span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
