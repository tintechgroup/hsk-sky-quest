"use client";

import Link from "next/link";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

interface LoginUser {
  id: string;

  name: string;

  username: string;

  role:
    | "user"
    | "admin";
}

interface LoginResponse {
  success: boolean;

  message?: string;

  data?: LoginUser;

  user?: LoginUser;
}

function getReturnPath() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/";
  }

  const searchParams =
    new URLSearchParams(
      window.location.search,
    );

  const returnTo =
    searchParams.get(
      "returnTo",
    ) ||
    searchParams.get(
      "redirect",
    ) ||
    "/";

  /*
   * Chỉ cho phép đường dẫn nội bộ.
   *
   * Không cho:
   * https://...
   * //domain.com
   * /login...
   *
   * Nhằm tránh open redirect và vòng lặp
   * quay lại trang đăng nhập.
   */
  if (
    !returnTo.startsWith(
      "/",
    ) ||
    returnTo.startsWith(
      "//",
    ) ||
    returnTo.startsWith(
      "/login",
    )
  ) {
    return "/";
  }

  return returnTo;
}

export default function LoginPage() {
  const [
    username,
    setUsername,
  ] =
    useState("");

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      | "success"
      | "error"
      | ""
    >("");

  const [
    loggedInUser,
    setLoggedInUser,
  ] =
    useState<
      LoginUser | null
    >(null);

  const [
    showWelcomeModal,
    setShowWelcomeModal,
  ] =
    useState(false);

  /*
   * ========================================
   * ĐỌC THÔNG TIN SAU KHI ĐĂNG KÝ
   * ========================================
   *
   * Trang register có thể chuyển về:
   *
   * /login?registered=1&username=abc
   *
   * Không gọi setState trực tiếp trong body
   * của useEffect để tránh:
   *
   * react-hooks/set-state-in-effect
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          const searchParams =
            new URLSearchParams(
              window.location.search,
            );

          const registered =
            searchParams.get(
              "registered",
            );

          const registeredUsername =
            searchParams.get(
              "username",
            );

          if (
            registered !==
            "1"
          ) {
            return;
          }

          setMessageType(
            "success",
          );

          setMessage(
            "Đăng ký thành công. Bạn hãy đăng nhập để bắt đầu chơi.",
          );

          if (
            registeredUsername
          ) {
            setUsername(
              registeredUsername,
            );
          }
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, []);

  /*
   * ========================================
   * ĐĂNG NHẬP
   * ========================================
   */
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedUsername =
      username
        .trim()
        .toLowerCase();

    if (
      !normalizedUsername
    ) {
      setMessageType(
        "error",
      );

      setMessage(
        "Vui lòng nhập tài khoản.",
      );

      return;
    }

    if (
      !password
    ) {
      setMessageType(
        "error",
      );

      setMessage(
        "Vui lòng nhập mật khẩu.",
      );

      return;
    }

    try {
      setIsSubmitting(
        true,
      );

      setMessage(
        "",
      );

      setMessageType(
        "",
      );

      const response =
        await fetch(
          "/api/auth/login",
          {
            method:
              "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                username:
                  normalizedUsername,

                password,
              }),
          },
        );

      const result =
        (await response.json()) as
          LoginResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Tài khoản hoặc mật khẩu không chính xác.",
        );
      }

      const user =
        result.data ||
        result.user;

      if (
        !user
      ) {
        throw new Error(
          "Đăng nhập thành công nhưng không nhận được thông tin người dùng.",
        );
      }

      /*
       * Không chuyển trang ngay.
       *
       * Hiển thị popup chào mừng trước để
       * người chơi đọc luật / thông tin.
       */
      setLoggedInUser(
        user,
      );

      setMessageType(
        "success",
      );

      setMessage(
        "Đăng nhập thành công.",
      );

      setShowWelcomeModal(
        true,
      );
    } catch (
      loginError
    ) {
      console.error(
        "Đăng nhập thất bại:",
        loginError,
      );

      setMessageType(
        "error",
      );

      setMessage(
        loginError instanceof
        Error
          ? loginError.message
          : "Không thể đăng nhập. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /*
   * ========================================
   * TIẾP TỤC VÀO GAME
   * ========================================
   */
  function continueToGame() {
    const returnPath =
      getReturnPath();

    /*
     * Chủ động reload document sau login.
     *
     * Lý do:
     * cookie auth vừa được server set sau
     * POST /api/auth/login.
     *
     * Full navigation giúp toàn bộ app,
     * layout và các component auth đọc lại
     * trạng thái đăng nhập mới.
     */
    window.location.replace(
      returnPath,
    );
  }

  function closeWelcomeModal() {
    setShowWelcomeModal(
      false,
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#164e63_0%,_#082f49_38%,_#020617_100%)] px-4 py-8 font-sans text-white sm:px-6 lg:px-8">

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">

        <section className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">

          {/* =====================================
              LEFT PANEL
              ===================================== */}

          <div className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 p-12 lg:flex lg:flex-col lg:justify-between">

            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />

            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/15 blur-3xl" />

            <div className="relative">

              <Link
                href="/"
                className="inline-flex items-center gap-3"
              >

                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-lg">
                  ✈️
                </span>

                <span>

                  <strong className="block text-xl font-black tracking-wide">
                    HSK SKY QUEST
                  </strong>

                  <small className="text-cyan-100">
                    Học tiếng Trung qua hành trình
                  </small>

                </span>

              </Link>

            </div>

            <div className="relative">

              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-50">
                CUỘC ĐUA KIẾN THỨC
              </span>

              <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight xl:text-5xl">
                Đăng nhập và bắt đầu hành trình khám phá
                Trung Quốc
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100">
                Trả lời câu hỏi HSK, tìm đối thủ, thi đấu
                theo đội và lưu lại toàn bộ thành tích của
                bạn.
              </p>

            </div>

            <div className="relative grid grid-cols-3 gap-3">

              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">

                <strong className="block text-2xl">
                  🗺️
                </strong>

                <span className="mt-2 block text-sm font-bold">
                  Khám phá tỉnh thành
                </span>

              </article>

              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">

                <strong className="block text-2xl">
                  ⚔️
                </strong>

                <span className="mt-2 block text-sm font-bold">
                  Thi đấu trực tuyến
                </span>

              </article>

              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">

                <strong className="block text-2xl">
                  🏆
                </strong>

                <span className="mt-2 block text-sm font-bold">
                  Lưu thành tích
                </span>

              </article>

            </div>

          </div>

          {/* =====================================
              LOGIN FORM
              ===================================== */}

          <div className="flex items-center p-5 sm:p-8 lg:p-12">

            <div className="mx-auto w-full max-w-md">

              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"
              >
                <span aria-hidden="true">
                  ←
                </span>

                Quay về trang chủ
              </Link>

              <div>

                <span className="inline-flex rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-black tracking-[0.16em] text-cyan-300">
                  ĐĂNG NHẬP NGƯỜI CHƠI
                </span>

                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                  Chào mừng trở lại
                </h2>

                <p className="mt-3 leading-7 text-slate-400">
                  Nhập tài khoản và mật khẩu để tiếp tục
                  hành trình.
                </p>

              </div>

              {/* MESSAGE */}

              {message && (
                <div
                  role={
                    messageType ===
                    "error"
                      ? "alert"
                      : "status"
                  }
                  className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    messageType ===
                    "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              {/* FORM */}

              <form
                className="mt-7 space-y-5"
                onSubmit={
                  handleSubmit
                }
              >

                <div>

                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-bold text-slate-200"
                  >
                    Tài khoản
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={
                      username
                    }
                    disabled={
                      isSubmitting
                    }
                    onChange={(
                      event,
                    ) =>
                      setUsername(
                        event.target.value,
                      )
                    }
                    placeholder="Nhập tên tài khoản"
                    className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                </div>

                <div>

                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-slate-200"
                  >
                    Mật khẩu
                  </label>

                  <div className="relative">

                    <input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={
                        password
                      }
                      disabled={
                        isSubmitting
                      }
                      onChange={(
                        event,
                      ) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      placeholder="Nhập mật khẩu"
                      className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 pr-14 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            previous,
                          ) =>
                            !previous,
                        )
                      }
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-lg transition hover:bg-white/10"
                    >
                      {showPassword
                        ? "🙈"
                        : "👁️"}
                    </button>

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Đang đăng nhập..."
                    : "Đăng nhập"}
                </button>

              </form>

              <div className="mt-7 border-t border-slate-800 pt-6 text-center">

                <p className="text-sm text-slate-400">
                  Bạn chưa có tài khoản?{" "}

                  <Link
                    href="/register"
                    className="font-black text-cyan-300 transition hover:text-cyan-200"
                  >
                    Đăng ký ngay
                  </Link>

                </p>

              </div>

            </div>

          </div>

        </section>

      </div>

      {/* =====================================
          WELCOME MODAL
          ===================================== */}

      {showWelcomeModal &&
        loggedInUser && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >

          <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[28px] border border-cyan-300/20 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/60 sm:p-8">

            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-yellow-300 to-orange-500 text-4xl shadow-lg shadow-orange-500/20">
              🎉
            </div>

            <div className="mt-5 text-center">

              <span className="text-sm font-black tracking-[0.16em] text-cyan-300">
                ĐĂNG NHẬP THÀNH CÔNG
              </span>

              <h2
                id="welcome-title"
                className="mt-3 text-3xl font-black text-white"
              >
                Chào mừng{" "}
                {
                  loggedInUser.name
                }
                !
              </h2>

              <p className="mt-2 text-slate-400">
                @
                {
                  loggedInUser.username
                }
              </p>

              {loggedInUser.role ===
                "admin" && (
                <span className="mt-3 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-300">
                  Quản trị viên
                </span>
              )}

            </div>

            <div className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">

              <h3 className="text-lg font-black text-white">
                📜 Luật chơi
              </h3>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300 sm:text-base">

                <li className="flex gap-3">

                  <span>
                    1️⃣
                  </span>

                  <span>
                    Chọn trình độ HSK phù hợp trước khi bắt
                    đầu.
                  </span>

                </li>

                <li className="flex gap-3">

                  <span>
                    2️⃣
                  </span>

                  <span>
                    Bay qua các tỉnh và chọn địa điểm nhảy
                    dù.
                  </span>

                </li>

                <li className="flex gap-3">

                  <span>
                    3️⃣
                  </span>

                  <span>
                    Thu thập vật phẩm hỗ trợ trước khi thi
                    đấu.
                  </span>

                </li>

                <li className="flex gap-3">

                  <span>
                    4️⃣
                  </span>

                  <span>
                    Trả lời chính xác và nhanh hơn đối thủ
                    để giành chiến thắng.
                  </span>

                </li>

                <li className="flex gap-3">

                  <span>
                    5️⃣
                  </span>

                  <span>
                    Kết quả, số trận và lịch sử thi đấu sẽ
                    được lưu vào tài khoản.
                  </span>

                </li>

              </ul>

            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">

              <button
                type="button"
                onClick={
                  closeWelcomeModal
                }
                className="h-12 rounded-2xl border border-slate-700 bg-slate-900 font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Xem lại thông tin
              </button>

              <button
                type="button"
                onClick={
                  continueToGame
                }
                className="h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-black text-slate-950 transition hover:brightness-110"
              >
                Bắt đầu hành trình →
              </button>

            </div>

          </section>

        </div>
      )}

    </main>
  );
}