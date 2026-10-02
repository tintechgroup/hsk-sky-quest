"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

interface CurrentUser {
  id: string;

  name: string;

  username: string;

  email?: string;

  phone?: string;

  role:
    | "user"
    | "admin";

  gamesPlayed: number;

  wins: number;

  losses: number;

  draws: number;

  totalScore: number;
}

interface MeResponse {
  success: boolean;

  authenticated?: boolean;

  message?: string;

  user?: CurrentUser;
}

interface UserMenuProps {
  className?: string;
}

function getInitials(
  name: string,
) {
  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    words.length ===
    0
  ) {
    return "U";
  }

  if (
    words.length ===
    1
  ) {
    return words[0]
      .slice(0, 1)
      .toUpperCase();
  }

  return (
    words[0].slice(
      0,
      1,
    ) +
    words[
      words.length - 1
    ].slice(
      0,
      1,
    )
  ).toUpperCase();
}

export default function UserMenu({
  className = "",
}: UserMenuProps) {
  const router =
    useRouter();

  const menuRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [
    user,
    setUser,
  ] =
    useState<
      CurrentUser | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    );

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false,
    );

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] =
    useState(
      false,
    );

  /*
   * ========================================
   * LOAD CURRENT USER
   * ========================================
   */
  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCurrentUser() {
      try {
        const response =
          await fetch(
            "/api/auth/me",
            {
              method:
                "GET",

              credentials:
                "include",

              cache:
                "no-store",

              signal:
                controller.signal,
            },
          );

        const result =
          (await response.json()) as
            MeResponse;

        if (
          response.ok &&
          result.success &&
          result.authenticated &&
          result.user
        ) {
          setUser(
            result.user,
          );
        } else {
          setUser(
            null,
          );
        }
      } catch (
        error
      ) {
        if (
          error instanceof
            Error &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        console.error(
          "Không thể tải thông tin tài khoản:",
          error,
        );

        setUser(
          null,
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setIsLoading(
            false,
          );
        }
      }
    }

    void loadCurrentUser();

    return () => {
      controller.abort();
    };
  }, []);

  /*
   * ========================================
   * CLOSE MENU
   * ========================================
   *
   * Đóng menu khi:
   * - click ra ngoài
   * - nhấn Escape
   */
  useEffect(() => {
    function handlePointerDown(
      event: PointerEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(
          false,
        );
      }
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setIsOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /*
   * ========================================
   * LOGOUT
   * ========================================
   */
  async function handleLogout() {
    if (
      isLoggingOut
    ) {
      return;
    }

    try {
      setIsLoggingOut(
        true,
      );

      await fetch(
        "/api/auth/logout",
        {
          method:
            "POST",

          credentials:
            "include",
        },
      );
    } catch (
      error
    ) {
      /*
       * Vẫn chuyển về trang chủ để
       * người dùng có thể đăng nhập lại.
       */
      console.error(
        "Không thể đăng xuất:",
        error,
      );
    } finally {
      setUser(
        null,
      );

      setIsOpen(
        false,
      );

      setIsLoggingOut(
        false,
      );

      /*
       * Điều hướng nội bộ bằng Next Router.
       *
       * Không dùng:
       *
       * window.location.href = "/";
       *
       * router.refresh() giúp Server Components
       * và các thành phần phụ thuộc cookie auth
       * đọc lại trạng thái đăng nhập mới.
       */
      router.replace(
        "/",
      );

      router.refresh();
    }
  }

  /*
   * ========================================
   * LOADING
   * ========================================
   */
  if (
    isLoading
  ) {
    return (
      <div
        className={`h-11 w-32 animate-pulse rounded-2xl bg-white/5 ${className}`}
        aria-label="Đang tải tài khoản"
      />
    );
  }

  /*
   * ========================================
   * NOT AUTHENTICATED
   * ========================================
   */
  if (
    !user
  ) {
    return (
      <div
        className={`flex items-center gap-2 ${className}`}
      >

        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200 transition hover:border-emerald-300/40 hover:bg-emerald-300/10 hover:text-emerald-200"
        >
          Đăng nhập
        </Link>

        <Link
          href="/register"
          className="hidden min-h-11 items-center justify-center rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#06272d] transition hover:bg-emerald-200 sm:inline-flex"
        >
          Đăng ký
        </Link>

      </div>
    );
  }

  /*
   * ========================================
   * AUTHENTICATED USER MENU
   * ========================================
   */
  return (
    <div
      ref={
        menuRef
      }
      className={`relative ${className}`}
    >

      {/* MENU BUTTON */}

      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (
              previous,
            ) =>
              !previous,
          )
        }
        aria-expanded={
          isOpen
        }
        aria-haspopup="menu"
        className="flex min-h-12 items-center gap-3 rounded-2xl border border-emerald-300/15 bg-[#0b293b]/95 p-1.5 pr-3 text-left shadow-lg shadow-black/10 transition hover:border-emerald-300/35 hover:bg-[#0e3247]"
      >

        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-sm font-black text-[#05252c]">
          {getInitials(
            user.name,
          )}
        </span>

        <span className="hidden min-w-0 sm:block">

          <strong className="block max-w-36 truncate text-sm font-black text-white">
            {
              user.name
            }
          </strong>

          <small className="block max-w-36 truncate text-xs text-emerald-300">
            @
            {
              user.username
            }
          </small>

        </span>

        <span
          className={`ml-1 text-xs text-slate-400 transition-transform ${
            isOpen
              ? "rotate-180"
              : ""
          }`}
        >
          ▼
        </span>

      </button>

      {/* MENU */}

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.65rem)] z-50 w-[min(330px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#071d2c] shadow-[0_25px_80px_rgba(0,0,0,0.55)]"
        >

          {/* =====================================
              USER INFORMATION
              ===================================== */}

          <div className="border-b border-white/5 bg-gradient-to-br from-emerald-300/10 to-cyan-300/5 p-5">

            <div className="flex items-center gap-4">

              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-cyan-300 text-lg font-black text-[#05252c]">
                {getInitials(
                  user.name,
                )}
              </span>

              <div className="min-w-0">

                <div className="flex flex-wrap items-center gap-2">

                  <strong className="truncate text-base font-black text-white">
                    {
                      user.name
                    }
                  </strong>

                  {user.role ===
                    "admin" && (
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[9px] font-black tracking-wider text-amber-200">
                      ADMIN
                    </span>
                  )}

                </div>

                <p className="mt-1 truncate text-sm text-emerald-300">
                  @
                  {
                    user.username
                  }
                </p>

              </div>

            </div>

          </div>

          {/* =====================================
              STATISTICS
              ===================================== */}

          <div className="grid grid-cols-3 gap-2 border-b border-white/5 p-4">

            <article className="rounded-2xl bg-white/5 p-3 text-center">

              <strong className="block text-lg font-black text-white">
                {
                  user.gamesPlayed
                }
              </strong>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Số trận
              </span>

            </article>

            <article className="rounded-2xl bg-emerald-300/8 p-3 text-center">

              <strong className="block text-lg font-black text-emerald-300">
                {
                  user.wins
                }
              </strong>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Thắng
              </span>

            </article>

            <article className="rounded-2xl bg-amber-300/8 p-3 text-center">

              <strong className="block text-lg font-black text-amber-200">
                {
                  user.totalScore
                }
              </strong>

              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Điểm
              </span>

            </article>

          </div>

          {/* =====================================
              NAVIGATION
              ===================================== */}

          <nav className="space-y-1 p-3">

            <Link
              href="/profile"
              role="menuitem"
              onClick={() =>
                setIsOpen(
                  false,
                )
              }
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >

              <span className="grid size-8 place-items-center rounded-xl bg-sky-300/10">
                👤
              </span>

              Hồ sơ và thành tích

            </Link>

            <Link
              href="/history"
              role="menuitem"
              onClick={() =>
                setIsOpen(
                  false,
                )
              }
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
            >

              <span className="grid size-8 place-items-center rounded-xl bg-violet-300/10">
                📜
              </span>

              Lịch sử thi đấu

            </Link>

            {user.role ===
              "admin" && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() =>
                  setIsOpen(
                    false,
                  )
                }
                className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-amber-200 transition hover:bg-amber-300/10"
              >

                <span className="grid size-8 place-items-center rounded-xl bg-amber-300/10">
                  ⚙
                </span>

                Trang quản trị

              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={
                handleLogout
              }
              disabled={
                isLoggingOut
              }
              className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >

              <span className="grid size-8 place-items-center rounded-xl bg-red-400/10">
                ↪
              </span>

              {isLoggingOut
                ? "Đang đăng xuất..."
                : "Đăng xuất"}

            </button>

          </nav>

        </div>
      )}

    </div>
  );
}