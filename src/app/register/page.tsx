"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

interface RegisterResponse {
  success: boolean;
  message?: string;

  user?: {
    id: string;
    name: string;
    username: string;
    role: "user" | "admin";
  };
}

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError("");
    setSuccess("");

    const cleanName =
      name.trim();

    const cleanUsername =
      username.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError(
        "Tên người dùng phải có ít nhất 2 ký tự.",
      );
      return;
    }

    if (cleanUsername.length < 4) {
      setError(
        "Tài khoản phải có ít nhất 4 ký tự.",
      );
      return;
    }

    if (
      !/^[a-z0-9._-]+$/.test(
        cleanUsername,
      )
    ) {
      setError(
        "Tài khoản chỉ được chứa chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.",
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Mật khẩu phải có ít nhất 6 ký tự.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Mật khẩu nhập lại không khớp.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name: cleanName,
            username:
              cleanUsername,
            password,
          }),
        },
      );

      const result =
        (await response.json()) as RegisterResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        setError(
          result.message ||
            "Không thể đăng ký tài khoản.",
        );
        return;
      }

      setSuccess(
        result.message ||
          "Đăng ký tài khoản thành công.",
      );

      window.setTimeout(() => {
        router.push(
          `/login?registered=1&username=${encodeURIComponent(
            cleanUsername,
          )}`,
        );
      }, 900);
    } catch {
      setError(
        "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#031521] px-4 py-8 text-white sm:px-6 sm:py-12">
      {/* Hiệu ứng nền */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 size-72 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="absolute -right-24 bottom-10 size-80 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      <section className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-emerald-300/15 bg-[#071d2c]/95 shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:grid-cols-[0.9fr_1.1fr]">
        {/* Giới thiệu */}
        <aside className="relative hidden overflow-hidden border-r border-white/5 bg-gradient-to-br from-emerald-400/15 via-[#08283a] to-[#061827] p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-emerald-300 text-2xl text-[#05242a] shadow-lg shadow-emerald-400/20">
                ✈
              </span>

              <span>
                <strong className="block text-lg font-black tracking-wide">
                  HSK SKY QUEST
                </strong>

                <small className="font-bold tracking-[0.2em] text-emerald-300">
                  CHINESE BATTLE
                </small>
              </span>
            </Link>

            <div className="mt-16">
              <span className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black tracking-[0.18em] text-emerald-300">
                TẠO HỒ SƠ PHI CÔNG
              </span>

              <h1 className="mt-6 max-w-md text-4xl font-black leading-tight">
                Bắt đầu hành trình chinh phục HSK
              </h1>

              <p className="mt-5 max-w-md leading-7 text-slate-300">
                Tạo tài khoản để tham gia đấu đội,
                lưu số trận, điểm số, thành tích và
                toàn bộ lịch sử thi đấu.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              "Ghép trận với người chơi thật",
              "Tự động lưu lịch sử thi đấu",
              "Theo dõi thắng, thua và tổng điểm",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-300/15 text-emerald-300">
                  ✓
                </span>

                <span>{item}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* Form đăng ký */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-xl">
            <div className="mb-8">
              <Link
                href="/"
                className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-emerald-300 lg:hidden"
              >
                ← Quay lại trang chủ
              </Link>

              <div className="mb-5 flex items-center gap-3 lg:hidden">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-300 text-xl text-[#05242a]">
                  ✈
                </span>

                <strong className="font-black">
                  HSK SKY QUEST
                </strong>
              </div>

              <span className="text-xs font-black tracking-[0.2em] text-emerald-300">
                ĐĂNG KÝ TÀI KHOẢN
              </span>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Tạo tài khoản mới
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
                Chỉ cần tên hiển thị, tài khoản và
                mật khẩu để bắt đầu.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200"
              >
                ⚠ {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-200"
              >
                ✓ {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-black text-slate-200"
                >
                  Tên người dùng
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  autoComplete="name"
                  placeholder="Ví dụ: Trần Trung Tín"
                  maxLength={100}
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0c293c] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-black text-slate-200"
                >
                  Tài khoản
                </label>

                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "",
                        ),
                    )
                  }
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Ví dụ: trungtin"
                  maxLength={30}
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0c293c] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10 disabled:opacity-60"
                />

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Dùng chữ thường không dấu, số,
                  dấu chấm, gạch dưới hoặc gạch ngang.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-black text-slate-200"
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
                      value={password}
                      onChange={(event) =>
                        setPassword(
                          event.target.value,
                        )
                      }
                      autoComplete="new-password"
                      placeholder="Ít nhất 6 ký tự"
                      maxLength={72}
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-[#0c293c] px-4 pr-14 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10 disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous,
                        )
                      }
                      className="absolute right-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
                      aria-label={
                        showPassword
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                      }
                    >
                      {showPassword
                        ? "🙈"
                        : "👁"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-black text-slate-200"
                  >
                    Nhập lại mật khẩu
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    autoComplete="new-password"
                    placeholder="Nhập lại mật khẩu"
                    maxLength={72}
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#0c293c] px-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/70 focus:ring-4 focus:ring-emerald-300/10 disabled:opacity-60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-6 font-black text-[#05252c] shadow-lg shadow-emerald-400/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
              >
                {isSubmitting
                  ? "Đang tạo tài khoản..."
                  : "Tạo tài khoản"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-400">
              Đã có tài khoản?{" "}
              <Link
                href="/login"
                className="font-black text-emerald-300 transition hover:text-emerald-200"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}