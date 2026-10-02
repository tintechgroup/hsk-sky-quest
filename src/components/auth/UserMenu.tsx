"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

interface UserData {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface AuthResponse {
  success: boolean;

  authenticated?: boolean;

  user?: UserData;

  data?: {
    user?: UserData;
  };

  message?: string;
}

function normalizeUser(
  data?: UserData,
): AuthUser | null {
  if (!data) {
    return null;
  }

  const id =
    data.id ??
    data._id ??
    "";

  const name =
    data.name?.trim() ??
    "";

  const email =
    data.email?.trim() ??
    "";

  if (
    !id ||
    !name ||
    !email
  ) {
    return null;
  }

  return {
    id,
    name,
    email,

    phone:
      data.phone?.trim() ||
      undefined,

    role:
      data.role?.trim() ||
      undefined,
  };
}

export default function UserMenu() {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  /*
   * ========================================
   * LOAD CURRENT USER
   * ========================================
   */
  const loadCurrentUser =
    useCallback(async () => {
      setLoading(true);

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
            },
          );

        if (
          !response.ok
        ) {
          setUser(
            null,
          );

          return;
        }

        const result =
          (await response.json()) as
            AuthResponse;

        if (
          !result.success ||
          result.authenticated ===
            false
        ) {
          setUser(
            null,
          );

          return;
        }

        const authenticatedUser =
          normalizeUser(
            result.user ??
              result.data
                ?.user,
          );

        setUser(
          authenticatedUser,
        );
      } catch (
        error
      ) {
        console.error(
          "Không thể tải tài khoản:",
          error,
        );

        setUser(
          null,
        );
      } finally {
        setLoading(
          false,
        );
      }
    }, []);

  /*
   * ========================================
   * AUTO LOAD USER
   * ========================================
   *
   * Không gọi loadCurrentUser()
   * trực tiếp trong body của effect.
   *
   * Điều này tránh lỗi:
   *
   * react-hooks/set-state-in-effect
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadCurrentUser();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    loadCurrentUser,
  ]);

  /*
   * ========================================
   * ĐÓNG MENU KHI CHUYỂN TRANG
   * ========================================
   *
   * pathname là dependency bên ngoài.
   * Không gọi setMenuOpen(false)
   * đồng bộ trong effect.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setMenuOpen(
            false,
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    pathname,
  ]);

  /*
   * ========================================
   * ĐÓNG MENU KHI CLICK RA NGOÀI
   * HOẶC NHẤN ESCAPE
   * ========================================
   */
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(
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
        setMenuOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
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
  async function logout() {
    if (
      loggingOut
    ) {
      return;
    }

    setLoggingOut(
      true,
    );

    try {
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
      console.error(
        "Không thể đăng xuất:",
        error,
      );
    } finally {
      setUser(
        null,
      );

      setMenuOpen(
        false,
      );

      setLoggingOut(
        false,
      );

      router.push(
        "/login",
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
    loading
  ) {
    return (
      <div
        className="h-11 w-36 animate-pulse rounded-xl bg-white/10"
        aria-label="Đang tải tài khoản"
      />
    );
  }

  /*
   * ========================================
   * CHƯA ĐĂNG NHẬP
   * ========================================
   */
  if (
    !user
  ) {
    return (
      <div className="flex items-center gap-2">

        <Link
          href="/login"
          className="grid min-h-11 place-items-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold text-slate-200 transition hover:bg-white/10 sm:px-4 sm:text-sm"
        >
          Đăng nhập
        </Link>

        <Link
          href="/register"
          className="hidden min-h-11 place-items-center rounded-xl bg-emerald-300 px-4 text-sm font-black text-[#062d32] transition hover:bg-emerald-200 sm:grid"
        >
          Đăng ký
        </Link>

      </div>
    );
  }

  const firstLetter =
    user.name
      .charAt(0)
      .toUpperCase();

  const isAdmin =
    user.role
      ?.toLowerCase() ===
    "admin";

  return (
    <div
      ref={
        menuRef
      }
      className="relative"
    >

      {/* =====================================
          MENU BUTTON
          ===================================== */}

      <button
        type="button"
        onClick={() =>
          setMenuOpen(
            (
              previous,
            ) =>
              !previous,
          )
        }
        className={`flex min-h-11 max-w-[230px] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition sm:px-3 ${
          menuOpen
            ? "border-emerald-300/40 bg-emerald-300/10"
            : "border-white/10 bg-white/5 hover:border-emerald-300/30 hover:bg-white/10"
        }`}
        aria-expanded={
          menuOpen
        }
        aria-haspopup="menu"
      >

        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-300 font-black text-[#062d32] sm:size-9">
          {firstLetter}
        </span>

        <span className="hidden min-w-0 sm:block">

          <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-300">
            Xin chào
          </span>

          <strong className="block max-w-[120px] truncate text-sm text-white">
            {user.name}
          </strong>

        </span>

        <span
          className={`ml-1 text-xs text-slate-400 transition-transform ${
            menuOpen
              ? "rotate-180"
              : ""
          }`}
        >
          ▼
        </span>

      </button>

      {/* =====================================
          MENU DROPDOWN
          ===================================== */}

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[min(310px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-emerald-300/15 bg-[#091f30] shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
        >

          {/* Thông tin tài khoản */}

          <div className="border-b border-white/10 bg-gradient-to-br from-emerald-300/10 to-blue-300/5 p-4">

            <div className="flex min-w-0 items-center gap-3">

              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-300 text-xl font-black text-[#062d32]">
                {firstLetter}
              </span>

              <div className="min-w-0">

                <strong className="block truncate text-base text-white">
                  {user.name}
                </strong>

                <span className="block truncate text-xs text-slate-400">
                  {user.email}
                </span>

                {user.phone && (
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {
                      user.phone
                    }
                  </span>
                )}

              </div>

            </div>

            <div className="mt-3 flex items-center gap-2">

              <span className="size-2 rounded-full bg-emerald-300" />

              <span className="text-xs font-bold text-emerald-200">
                Đang đăng nhập
              </span>

            </div>

          </div>

          {/* =================================
              ĐIỀU HƯỚNG
              ================================= */}

          <nav className="grid gap-1 p-2">

            <MenuLink
              href="/"
              icon="✈️"
              title="Bắt đầu hành trình"
              description="Khám phá và tham gia trận đấu"
              active={
                pathname ===
                "/"
              }
            />

            <MenuLink
              href="/error-log"
              icon="📕"
              title="Sổ câu trả lời sai"
              description="Xem lại và ôn tập câu sai"
              active={
                pathname ===
                "/error-log"
              }
            />

            {isAdmin && (
              <>

                <div className="my-1 h-px bg-white/10" />

                <MenuLink
                  href="/admin"
                  icon="⚙️"
                  title="Trang quản trị"
                  description="Quản lý toàn bộ hệ thống"
                  active={
                    pathname ===
                    "/admin"
                  }
                />

                <MenuLink
                  href="/admin/regions"
                  icon="🗺️"
                  title="Quản lý tỉnh"
                  description="Thêm và sửa tỉnh thành"
                  active={
                    pathname.startsWith(
                      "/admin/regions",
                    )
                  }
                />

                <MenuLink
                  href="/admin/questions"
                  icon="❓"
                  title="Quản lý câu hỏi"
                  description="Thêm và sửa câu hỏi HSK"
                  active={
                    pathname.startsWith(
                      "/admin/questions",
                    )
                  }
                />

              </>
            )}

          </nav>

          {/* =================================
              ĐĂNG XUẤT
              ================================= */}

          <div className="border-t border-white/10 p-2">

            <button
              type="button"
              onClick={() =>
                void logout()
              }
              disabled={
                loggingOut
              }
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <span className="grid size-9 place-items-center rounded-xl bg-red-400/10 text-lg">
                🚪
              </span>

              <span>
                {loggingOut
                  ? "Đang đăng xuất..."
                  : "Đăng xuất"}
              </span>

            </button>

          </div>

        </div>
      )}

    </div>
  );
}

function MenuLink({
  href,
  icon,
  title,
  description,
  active,
}: {
  href: string;

  icon: string;

  title: string;

  description: string;

  active: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      role="menuitem"
      className={`flex min-h-[58px] items-center gap-3 rounded-xl px-3 py-2 transition ${
        active
          ? "bg-emerald-300/15 text-emerald-100"
          : "text-slate-200 hover:bg-white/5"
      }`}
    >

      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg ${
          active
            ? "bg-emerald-300/15"
            : "bg-white/5"
        }`}
      >
        {icon}
      </span>

      <span className="min-w-0">

        <strong className="block truncate text-sm">
          {title}
        </strong>

        <small className="block truncate text-[11px] text-slate-500">
          {description}
        </small>

      </span>

      <span className="ml-auto text-xs text-slate-600">
        ›
      </span>

    </Link>
  );
}