type WindowProps = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function Window({
  title,
  children,
  onClose,
}: WindowProps) {
  return (
    <div className="fixed left-40 top-28 w-[700px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">

      <div className="flex items-center justify-between border-b border-zinc-700 p-3">

        <span className="font-semibold">
          {title}
        </span>

        <button
          onClick={onClose}
          className="rounded px-2 hover:bg-zinc-700"
        >
          ✕
        </button>

      </div>

      {children}

    </div>
  );
}