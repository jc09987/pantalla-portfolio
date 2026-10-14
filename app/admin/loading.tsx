export default function AdminLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center px-6 py-16">
      <div className="flex flex-col items-center gap-3">
        <span className="admin-spinner admin-spinner-lg" />
        <p className="text-sm font-bold text-zinc-500">Cargando…</p>
      </div>
    </div>
  );
}
