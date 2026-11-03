"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
  href: string;
  label: string;
  description: string;
  icon: string;
  exact?: boolean;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/admin",
    label: "Tổng quan",
    description: "Bảng điều khiển",
    icon: "📊",
    exact: true,
  },
  {
    href: "/admin/regions",
    label: "Tỉnh/thành",
    description: "Bản đồ trong trò chơi",
    icon: "🗺️",
  },
  {
    href: "/admin/explore-regions?view=stickers",
    label: "Sticker tỉnh",
    description: "Nội dung và trắc nghiệm",
    icon: "🎴",
  },
  {
    href: "/admin/questions",
    label: "Câu hỏi",
    description: "Ngân hàng HSK",
    icon: "📝",
  },
];

function getPath(href: string): string {
  return href.split("?")[0];
}

function checkActive(pathname: string, item: NavigationItem): boolean {
  const itemPath = getPath(item.href);

  if (item.exact) {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {NAVIGATION_ITEMS.map((item) => {
        const active = checkActive(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              mobile
                ? `flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-black transition ${
                    active
                      ? "border-emerald-300/30 bg-emerald-300 text-[#062d32]"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`
                : `flex items-center gap-3 rounded-2xl border px-3 py-3 transition ${
                    active
                      ? "border-emerald-300/30 bg-emerald-300/10 text-white shadow-[0_8px_25px_rgba(52,211,153,0.08)]"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  }`
            }
          >
            <span
              className={
                mobile
                  ? "text-base"
                  : `grid size-10 shrink-0 place-items-center rounded-xl text-lg ${
                      active
                        ? "bg-emerald-300 text-[#062d32]"
                        : "bg-white/[0.06]"
                    }`
              }
            >
              {item.icon}
            </span>

            <span className={mobile ? "" : "min-w-0"}>
              <strong className={mobile ? "" : "block truncate text-sm font-black"}>
                {item.label}
              </strong>

              {!mobile && (
                <small className="mt-0.5 block truncate text-[11px] opacity-65">
                  {item.description}
                </small>
              )}
            </span>

            {!mobile && active && (
              <span className="ml-auto text-emerald-300">●</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminNavigation() {
  return (
    <>
      <aside className="hidden min-h-screen border-r border-white/10 bg-[#061827] lg:block">
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
          <header className="border-b border-white/10 p-5">
            <Link href="/admin" className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-xl shadow-[0_10px_30px_rgba(52,211,153,0.18)]">
                ✈
              </span>

              <span className="min-w-0">
                <strong className="block truncate text-sm font-black text-white">
                  HSK SKY QUEST
                </strong>
                <span className="text-[10px] font-black tracking-widest text-emerald-300">
                  ADMIN PANEL
                </span>
              </span>
            </Link>
          </header>

          <nav aria-label="Điều hướng quản trị" className="flex-1 p-4">
            <p className="mb-3 px-3 text-[10px] font-black tracking-[0.16em] text-slate-600">
              QUẢN LÝ HỆ THỐNG
            </p>

            <div className="space-y-2">
              <NavigationLinks />
            </div>

            <p className="mb-3 mt-7 px-3 text-[10px] font-black tracking-[0.16em] text-slate-600">
              TRUY CẬP NHANH
            </p>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-slate-400 transition hover:border-cyan-300/20 hover:bg-cyan-300/10 hover:text-white"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-lg">
                🎮
              </span>
              <span>
                <strong className="block text-sm font-black">Xem trò chơi</strong>
                <small className="mt-0.5 block text-[11px] opacity-65">
                  Quay lại trang người chơi
                </small>
              </span>
            </Link>
          </nav>

          <footer className="border-t border-white/10 p-4">
            <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/5 p-4">
              <span className="text-[10px] font-black tracking-widest text-emerald-300">
                MONGODB
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" />
                <span className="text-xs font-bold text-slate-300">
                  Dữ liệu trực tuyến
                </span>
              </div>
            </div>
          </footer>
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061827]/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-lg">
              ✈
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-xs font-black text-white sm:text-sm">
                HSK SKY QUEST
              </strong>
              <span className="block text-[9px] font-black tracking-widest text-emerald-300">
                ADMIN
              </span>
            </span>
          </Link>

          <Link
            href="/"
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-200"
          >
            🎮 Trò chơi
          </Link>
        </div>

        <nav
          aria-label="Điều hướng quản trị mobile"
          className="flex gap-2 overflow-x-auto px-3 pb-3 sm:px-5"
        >
          <NavigationLinks mobile />
        </nav>
      </header>
    </>
  );
}