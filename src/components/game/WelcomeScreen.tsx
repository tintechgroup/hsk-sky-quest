"use client";

import type { HSKLevel } from "@/types/game";

interface WelcomeScreenProps {
  level: HSKLevel;
  onLevelChange: (level: HSKLevel) => void;
  onStart: () => void;
}

const LEVELS: {
  value: HSKLevel;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    value: 3,
    label: "HSK 3",
    description: "Nền tảng",
    color:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  },
  {
    value: 4,
    label: "HSK 4",
    description: "Trung cấp",
    color:
      "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  },
  {
    value: 5,
    label: "HSK 5",
    description: "Nâng cao",
    color:
      "border-blue-300/30 bg-blue-300/10 text-blue-200",
  },
  {
    value: 6,
    label: "HSK 6",
    description: "Thử thách",
    color:
      "border-violet-300/30 bg-violet-300/10 text-violet-200",
  },
];

const FEATURES = [
  {
    icon: "✈️",
    title: "Khám phá Trung Quốc",
    description:
      "Bay qua các tỉnh và lựa chọn điểm đến.",
  },
  {
    icon: "🪂",
    title: "Nhảy dù thu thập",
    description:
      "Tiếp đất và nhận vật phẩm hỗ trợ.",
  },
  {
    icon: "⚔️",
    title: "Thi đấu HSK",
    description:
      "Trả lời câu hỏi và cạnh tranh cùng đội.",
  },
];

export default function WelcomeScreen({
  level,
  onLevelChange,
  onStart,
}: WelcomeScreenProps) {
  return (
    <section className="relative isolate w-full overflow-hidden rounded-[24px] border border-emerald-300/20 bg-[#071c2d] shadow-[0_25px_80px_rgba(0,8,20,0.5)] sm:rounded-[30px]">
      {/* Hiệu ứng nền */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(52,211,153,0.15),transparent_32%),radial-gradient(circle_at_90%_80%,rgba(56,189,248,0.12),transparent_34%),linear-gradient(145deg,#102f43_0%,#071c2d_52%,#04131f_100%)]" />

      <div className="pointer-events-none absolute -left-28 top-28 -z-10 size-72 rounded-full bg-emerald-300/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-32 bottom-10 -z-10 size-80 rounded-full bg-cyan-300/10 blur-3xl" />

      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-white/[0.07] bg-[#061a29]/80 px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-xl shadow-[0_8px_25px_rgba(52,211,153,0.2)] sm:size-12">
            ✈
          </div>

          <div className="min-w-0">
            <strong className="block truncate text-sm font-black tracking-wide text-white sm:text-base">
              HSK SKY QUEST
            </strong>

            <span className="block text-[9px] font-black tracking-[0.14em] text-emerald-300 sm:text-[10px]">
              LEARN · EXPLORE · CONQUER
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 md:w-auto md:justify-start">
          <span className="text-[10px] font-black tracking-widest text-slate-500">
            ĐIỂM ĐẾN
          </span>

          <strong className="text-sm text-amber-200">
            Trung Quốc
          </strong>

          <span
            lang="zh-CN"
            className="text-sm font-bold text-white"
          >
            中国
          </span>
        </div>
      </header>

      {/* Nội dung chính */}
      <div className="grid gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-12 xl:px-14 xl:py-14">
        {/* Nội dung giới thiệu */}
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-0.5 w-7 bg-emerald-300 sm:w-10" />

            <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300 sm:text-xs">
              HÀNH TRÌNH HỌC TIẾNG TRUNG
            </span>
          </div>

          <h1 className="max-w-3xl text-[34px] font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            Chào mừng bạn đến với{" "}
            <span className="mt-1 block bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent sm:mt-2">
              HSK Sky Quest
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8 lg:text-lg">
            Bay qua những vùng đất nổi tiếng,
            khám phá địa lý, văn hóa Trung Quốc
            và chinh phục kiến thức HSK qua từng
            thử thách.
          </p>

          {/* Tính năng */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <article
                key={feature.title}
                className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 sm:block"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-xl sm:mb-3">
                  {feature.icon}
                </div>

                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white">
                    {feature.title}
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
            <span>✓ Câu hỏi theo tỉnh</span>
            <span>✓ Lưu lịch sử chơi</span>
            <span>✓ Thi đấu nhiều người</span>
          </div>
        </div>

        {/* Chọn cấp độ */}
        <aside className="min-w-0 rounded-[22px] border border-white/10 bg-[#0b263a]/90 p-4 shadow-2xl backdrop-blur-md sm:p-6 lg:p-7">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-300">
              CHỌN THỬ THÁCH
            </span>

            <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
              Trình độ của bạn
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Câu hỏi trong trận đấu sẽ tương ứng
              với cấp độ đã chọn.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {LEVELS.map((item) => {
              const selected =
                level === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() =>
                    onLevelChange(item.value)
                  }
                  aria-pressed={selected}
                  className={`relative min-h-[92px] rounded-2xl border p-3 text-left transition duration-200 sm:min-h-[104px] sm:p-4 ${
                    selected
                      ? `${item.color} -translate-y-0.5 shadow-[0_12px_28px_rgba(52,211,153,0.12)]`
                      : "border-white/[0.08] bg-white/[0.035] text-slate-300 hover:border-emerald-300/30 hover:bg-emerald-300/[0.06]"
                  }`}
                >
                  {selected && (
                    <span className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-emerald-300 text-[10px] font-black text-[#062d32]">
                      ✓
                    </span>
                  )}

                  <strong className="block text-base font-black sm:text-lg">
                    {item.label}
                  </strong>

                  <span className="mt-1 block text-[11px] opacity-75 sm:text-xs">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>

              <p className="text-xs leading-5 text-amber-100/90 sm:text-sm sm:leading-6">
                Bạn đang chọn{" "}
                <strong className="text-amber-200">
                  HSK {level}
                </strong>
                . Có thể thay đổi cấp độ trước khi
                bắt đầu hành trình.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-emerald-300 to-cyan-300 px-4 text-sm font-black text-[#052a30] shadow-[0_15px_35px_rgba(52,211,153,0.18)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(52,211,153,0.28)] active:translate-y-0 sm:text-base"
          >
            <span>BẮT ĐẦU HÀNH TRÌNH</span>
            <span aria-hidden="true">→</span>
          </button>

          <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
            Bạn cần đăng nhập để lưu tiến độ và
            lịch sử thi đấu.
          </p>
        </aside>
      </div>
    </section>
  );
}