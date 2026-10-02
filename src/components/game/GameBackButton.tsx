"use client";

interface GameBackButtonProps {
  label?: string;
  onClick: () => void;
  disabled?: boolean;
  position?: "normal" | "absolute";
}

export default function GameBackButton({
  label = "Quay lại",
  onClick,
  disabled = false,
  position = "normal",
}: GameBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`
        z-40 inline-flex min-h-11 items-center
        justify-center gap-2 rounded-xl border
        border-white/10 bg-[#071c2c]/90 px-4
        text-sm font-bold text-slate-200
        shadow-lg backdrop-blur-md transition
        hover:-translate-y-0.5
        hover:border-emerald-300/40
        hover:bg-emerald-300/10
        hover:text-emerald-200
        focus:outline-none focus:ring-2
        focus:ring-emerald-300/50
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${
          position === "absolute"
            ? "absolute left-3 top-3 sm:left-5 sm:top-5"
            : ""
        }
      `}
    >
      <span
        aria-hidden="true"
        className="text-lg leading-none"
      >
        ←
      </span>

      <span className="hidden sm:inline">
        {label}
      </span>

      <span className="sm:hidden">
        Quay lại
      </span>
    </button>
  );
}