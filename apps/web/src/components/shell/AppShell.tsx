export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <header className="flex h-14 items-center justify-between border-b border-zinc-800 px-6">
        <h1 className="text-lg font-semibold tracking-widest">
          LEVIATHAN
        </h1>

        <span className="text-sm text-zinc-500">
          17:53
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <p className="text-zinc-500">
          Workspace
        </p>
      </main>

      <footer className="border-t border-zinc-800 p-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3">
          &gt;
        </div>
      </footer>
    </div>
  );
}