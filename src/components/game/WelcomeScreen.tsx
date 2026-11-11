"use client";

import Link from "next/link";
import type { HSKLevel } from "@/types/game";
import { useLanguage } from "@/contexts/LanguageContext";

interface WelcomeScreenProps {
  level: HSKLevel;
  onLevelChange: (level: HSKLevel) => void;
  onStart: () => void;
}

const LEVELS: {
  value: HSKLevel;
  label: string;
  color: string;
  descriptionVi: string;
  descriptionZh: string;
}[] = [
  {
    value: 3,
    label: "HSK 3",
    descriptionVi: "Sơ cấp · Giao tiếp quen thuộc",
    descriptionZh: "初级 · 日常交流",
    color: "border-emerald-300/30 bg-emerald-300/10 text-emerald-200",
  },
  {
    value: 4,
    label: "HSK 4",
    descriptionVi: "Trung cấp · Nhiều tình huống",
    descriptionZh: "中级 · 多种交流场景",
    color: "border-cyan-300/30 bg-cyan-300/10 text-cyan-200",
  },
  {
    value: 5,
    label: "HSK 5",
    descriptionVi: "Khá · Hiểu và diễn đạt",
    descriptionZh: "中高级 · 理解与表达",
    color: "border-blue-300/30 bg-blue-300/10 text-blue-200",
  },
  {
    value: 6,
    label: "HSK 6",
    descriptionVi: "Nâng cao · Thành thạo",
    descriptionZh: "高级 · 熟练运用中文",
    color: "border-violet-300/30 bg-violet-300/10 text-violet-200",
  },
];

export default function WelcomeScreen({
  level,
  onLevelChange,
  onStart,
}: WelcomeScreenProps) {
  const { language } = useLanguage();

  const localize = (vietnamese: string, chinese: string) =>
    language === "zh" ? chinese : vietnamese;

  const greeting = localize(
    "Chào bạn, nhà thám hiểm!",
    "探险家，你好！",
  );

  const features = [
    {
      icon: "✈️",
      title: localize("Khám phá Trung Quốc", "探索中国"),
      description: localize(
        "Bay qua các tỉnh và lựa chọn điểm đến.",
        "飞越各个省份，选择你的目的地。",
      ),
    },
    {
      icon: "🪂",
      title: localize("Thu thập vật phẩm", "收集道具"),
      description: localize(
        "Tiếp đất an toàn và nhận vật phẩm hỗ trợ.",
        "安全着陆并获得辅助道具。",
      ),
    },
    {
      icon: "⚔️",
      title: localize("Thử thách HSK", "HSK挑战"),
      description: localize(
        "Trả lời câu hỏi và cạnh tranh cùng đội.",
        "回答问题，与队友和对手一较高下。",
      ),
    },
  ];

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
              {greeting}
            </strong>

            <span className="block text-[9px] font-black tracking-[0.14em] text-emerald-300 sm:text-[10px]">
              {localize(
                "HỌC · KHÁM PHÁ · CHINH PHỤC",
                "学习 · 探索 · 征服",
              )}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 md:w-auto md:justify-start">
          <span className="text-[10px] font-black tracking-widest text-slate-500">
            {localize("ĐIỂM ĐẾN", "目的地")}
          </span>

          <strong className="text-sm text-amber-200">
            {localize("Trung Quốc", "中国")}
          </strong>

          {language !== "zh" && (
            <span lang="zh-CN" className="text-sm font-bold text-white">
              中国
            </span>
          )}
        </div>
      </header>

      {/* Nội dung chính */}
      <div className="grid gap-7 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:items-center lg:gap-10 lg:px-10 lg:py-12 xl:px-14 xl:py-14">
        {/* Nội dung giới thiệu */}
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-0.5 w-7 bg-emerald-300 sm:w-10" />

            <span className="text-[10px] font-black tracking-[0.16em] text-emerald-300 sm:text-xs">
              {localize("HÀNH TRÌNH KHÁM PHÁ", "探索之旅")}
            </span>
          </div>

          <h1 className="max-w-3xl text-[34px] font-black leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl sm:leading-[1.05] lg:text-6xl">
            {localize("Khám phá Trung Quốc", "探索中国")}
            <span className="mt-2 block bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
              {greeting}
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base sm:leading-8 lg:text-lg">
            {localize(
              "Bay qua các tỉnh thành, khám phá văn hóa và chinh phục thử thách HSK trên hành trình của bạn.",
              "飞越各个省份，探索当地文化，在旅途中完成 HSK 挑战。",
            )}
          </p>

          {/* Tính năng */}
          <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {features.map((feature) => (
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
            <span>
              ✓ {localize("Câu hỏi theo từng vùng", "各地区专属题目")}
            </span>
            <span>
              ✓ {localize("Lưu lịch sử chơi", "保存游戏记录")}
            </span>
            <span>
              ✓ {localize("Chơi cùng bạn bè", "与好友一起游玩")}
            </span>
          </div>
        </div>

        {/* Chọn cấp độ */}
        <aside className="min-w-0 rounded-[22px] border border-white/10 bg-[#0b263a]/90 p-4 shadow-2xl backdrop-blur-md sm:p-6 lg:p-7">
          <div className="text-center">
            <span className="inline-flex rounded-full bg-emerald-300/10 px-3 py-1 text-[10px] font-black tracking-widest text-emerald-300">
              {localize("THỬ THÁCH CỦA BẠN", "你的挑战")}
            </span>

            <h2 className="mt-3 text-xl font-black text-white sm:text-2xl">
              {localize("Chọn cấp độ HSK", "选择 HSK 等级")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {localize(
                "Chọn cấp độ phù hợp với khả năng tiếng Trung hiện tại của bạn.",
                "请选择适合你当前中文水平的等级。",
              )}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            {LEVELS.map((item) => {
              const selected = level === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onLevelChange(item.value)}
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
                    {language === "zh"
                      ? item.descriptionZh
                      : item.descriptionVi}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>

              <p className="text-xs leading-5 text-amber-100/90 sm:text-sm sm:leading-6">
                {localize("Bạn đã chọn cấp độ", "你已选择等级")}{" "}
                <strong className="text-amber-200">HSK {level}</strong>.{" "}
                {localize(
                  "Bạn có thể đổi cấp độ trước khi bắt đầu.",
                  "开始前你可以更改等级。",
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 via-emerald-300 to-cyan-300 px-4 text-sm font-black text-[#052a30] shadow-[0_15px_35px_rgba(52,211,153,0.18)] transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(52,211,153,0.28)] active:translate-y-0 sm:text-base"
          >
            <span>{localize("Bắt đầu hành trình", "开始旅程")}</span>
            <span aria-hidden="true">→</span>
          </button>

          <Link
            href="/explore-china"
            className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-200/25 bg-cyan-200/[.08] px-4 text-sm font-black text-cyan-100 no-underline transition hover:-translate-y-0.5 hover:border-cyan-200/50 hover:bg-cyan-200/[.14] sm:text-base"
          >
            <span aria-hidden="true">🗺️</span>
            <span>{localize("Khám phá Trung Quốc", "探索中国")}</span>
            <span aria-hidden="true">→</span>
          </Link>

          <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
            {localize(
              "Đăng nhập để lưu lịch sử và tiến độ chơi của bạn.",
              "登录后即可保存你的游戏记录和进度。",
            )}
          </p>
        </aside>
      </div>
    </section>
  );
}