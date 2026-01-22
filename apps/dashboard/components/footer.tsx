export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/90">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} FW Admin</p>
        <p className="font-semibold text-brand-blue">Status: Gateway scaffolding in progress</p>
      </div>
    </footer>
  );
}
