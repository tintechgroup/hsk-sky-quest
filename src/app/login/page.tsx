"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface LoginUser {
  id: string;
  name: string;
  username: string;
  role: "user" | "admin";
}

interface LoginResponse {
  success: boolean;
  message?: string;
  data?: LoginUser;
  user?: LoginUser;
}

const translations = {
  vi: {
    tagline: "Học tiếng Trung qua hành trình",
    badge: "CUỘC ĐUA KIẾN THỨC",
    headline: "Đăng nhập và bắt đầu hành trình khám phá Trung Quốc",
    description:
      "Trả lời câu hỏi HSK, tìm đối thủ, thi đấu theo đội và lưu lại toàn bộ thành tích của bạn.",
    explore: "Khám phá tỉnh thành",
    compete: "Thi đấu trực tuyến",
    achievements: "Lưu thành tích",
    home: "Quay về trang chủ",
    loginBadge: "ĐĂNG NHẬP NGƯỜI CHƠI",
    welcomeBack: "Chào mừng trở lại",
    loginDescription: "Nhập tài khoản và mật khẩu để tiếp tục hành trình.",
    username: "Tài khoản",
    usernamePlaceholder: "Nhập tên tài khoản",
    password: "Mật khẩu",
    passwordPlaceholder: "Nhập mật khẩu",
    hidePassword: "Ẩn mật khẩu",
    showPassword: "Hiện mật khẩu",
    loggingIn: "Đang đăng nhập...",
    login: "Đăng nhập",
    noAccount: "Bạn chưa có tài khoản?",
    register: "Đăng ký ngay",
    registered: "Đăng ký thành công. Bạn hãy đăng nhập để bắt đầu chơi.",
    enterUsername: "Vui lòng nhập tài khoản.",
    enterPassword: "Vui lòng nhập mật khẩu.",
    invalidCredentials: "Tài khoản hoặc mật khẩu không chính xác.",
    missingUser:
      "Đăng nhập thành công nhưng không nhận được thông tin người dùng.",
    loginError: "Không thể đăng nhập. Vui lòng thử lại.",
    loginSuccess: "Đăng nhập thành công.",
    loginSuccessBadge: "ĐĂNG NHẬP THÀNH CÔNG",
    hello: "Chào mừng",
    administrator: "Quản trị viên",
    gameRules: "📜 Luật chơi",
    rule1: "Chọn trình độ HSK phù hợp trước khi bắt đầu.",
    rule2: "Bay qua các tỉnh và chọn địa điểm nhảy dù.",
    rule3: "Thu thập vật phẩm hỗ trợ trước khi thi đấu.",
    rule4: "Trả lời chính xác và nhanh hơn đối thủ để giành chiến thắng.",
    rule5: "Kết quả, số trận và lịch sử thi đấu sẽ được lưu vào tài khoản.",
    review: "Xem lại thông tin",
    start: "Bắt đầu hành trình →",
  },
  zh: {
    tagline: "在旅途中学习中文",
    badge: "知识竞赛",
    headline: "登录并开启中国探索之旅",
    description: "回答 HSK 问题、寻找对手、参加团队比赛，并保存你的所有成绩。",
    explore: "探索各地",
    compete: "在线竞技",
    achievements: "保存成绩",
    home: "返回首页",
    loginBadge: "玩家登录",
    welcomeBack: "欢迎回来",
    loginDescription: "输入账号和密码，继续你的旅程。",
    username: "账号",
    usernamePlaceholder: "请输入账号",
    password: "密码",
    passwordPlaceholder: "请输入密码",
    hidePassword: "隐藏密码",
    showPassword: "显示密码",
    loggingIn: "正在登录...",
    login: "登录",
    noAccount: "还没有账号？",
    register: "立即注册",
    registered: "注册成功。请登录后开始游戏。",
    enterUsername: "请输入账号。",
    enterPassword: "请输入密码。",
    invalidCredentials: "账号或密码不正确。",
    missingUser: "登录成功，但未能获取用户信息。",
    loginError: "无法登录，请重试。",
    loginSuccess: "登录成功。",
    loginSuccessBadge: "登录成功",
    hello: "欢迎",
    administrator: "管理员",
    gameRules: "📜 游戏规则",
    rule1: "开始前请选择适合自己的 HSK 等级。",
    rule2: "飞越各个省份，并选择跳伞地点。",
    rule3: "比赛前收集辅助道具。",
    rule4: "比对手答得更准确、更快即可获胜。",
    rule5: "比赛结果、场次和历史记录会保存到账号中。",
    review: "查看说明",
    start: "开始旅程 →",
  },
} as const;

function getReturnPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  const searchParams = new URLSearchParams(window.location.search);
  const returnTo =
    searchParams.get("returnTo") ||
    searchParams.get("redirect") ||
    "/";

  /*
   * Chỉ cho phép đường dẫn nội bộ.
   * Không cho URL ngoài, đường dẫn //domain.com
   * hoặc quay lại trang đăng nhập để tránh open redirect.
   */
  if (
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.startsWith("/login")
  ) {
    return "/";
  }

  return returnTo;
}

export default function LoginPage() {
  const { language } = useLanguage();
  const t = language === "zh" ? translations.zh : translations.vi;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");
  const [loggedInUser, setLoggedInUser] = useState<LoginUser | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  /*
   * Đọc thông tin đăng ký:
   * /login?registered=1&username=abc
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const registered = searchParams.get("registered");
      const registeredUsername = searchParams.get("username");

      if (registered !== "1") {
        return;
      }

      setMessageType("success");
      setMessage(t.registered);

      if (registeredUsername) {
        setUsername(registeredUsername);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [t.registered]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = username.trim().toLowerCase();

    if (!normalizedUsername) {
      setMessageType("error");
      setMessage(t.enterUsername);
      return;
    }

    if (!password) {
      setMessageType("error");
      setMessage(t.enterPassword);
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");
      setMessageType("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: normalizedUsername,
          password,
        }),
      });

      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || t.invalidCredentials);
      }

      const user = result.data || result.user;

      if (!user) {
        throw new Error(t.missingUser);
      }

      /*
       * Giữ nguyên luồng hiện tại:
       * đăng nhập thành công thì hiện hộp chào mừng và luật chơi trước.
       */
      setLoggedInUser(user);
      setMessageType("success");
      setMessage(t.loginSuccess);
      setShowWelcomeModal(true);
    } catch (loginError) {
      console.error("Đăng nhập thất bại:", loginError);

      setMessageType("error");
      setMessage(
        loginError instanceof Error ? loginError.message : t.loginError,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function continueToGame() {
    const returnPath = getReturnPath();

    /*
     * Tải lại ứng dụng sau đăng nhập để layout và các component
     * nhận được cookie xác thực mới.
     */
    window.location.replace(returnPath);
  }

  function closeWelcomeModal() {
    setShowWelcomeModal(false);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#164e63_0%,_#082f49_38%,_#020617_100%)] px-4 py-8 font-sans text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/70 shadow-2xl shadow-cyan-950/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* Giới thiệu trò chơi */}
          <div className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-800 p-12 lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-yellow-300/15 blur-3xl" />

            <div className="relative">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-2xl shadow-lg">
                  ✈️
                </span>

                <span>
                  <strong className="block text-xl font-black tracking-wide">
                    HSK SKY QUEST
                  </strong>
                  <small className="text-cyan-100">{t.tagline}</small>
                </span>
              </Link>
            </div>

            <div className="relative">
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-cyan-50">
                {t.badge}
              </span>

              <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight xl:text-5xl">
                {t.headline}
              </h1>

              <p className="mt-5 max-w-lg text-lg leading-8 text-blue-100">
                {t.description}
              </p>
            </div>

            <div className="relative grid grid-cols-3 gap-3">
              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <strong className="block text-2xl">🗺️</strong>
                <span className="mt-2 block text-sm font-bold">{t.explore}</span>
              </article>

              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <strong className="block text-2xl">⚔️</strong>
                <span className="mt-2 block text-sm font-bold">{t.compete}</span>
              </article>

              <article className="rounded-2xl border border-white/15 bg-white/10 p-4">
                <strong className="block text-2xl">🏆</strong>
                <span className="mt-2 block text-sm font-bold">
                  {t.achievements}
                </span>
              </article>
            </div>
          </div>

          {/* Form đăng nhập */}
          <div className="flex items-center p-5 sm:p-8 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <Link
                href="/"
                className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"
              >
                <span aria-hidden="true">←</span>
                {t.home}
              </Link>

              <div>
                <span className="inline-flex rounded-full bg-cyan-400/10 px-3 py-1.5 text-xs font-black tracking-[0.16em] text-cyan-300">
                  {t.loginBadge}
                </span>

                <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                  {t.welcomeBack}
                </h2>

                <p className="mt-3 leading-7 text-slate-400">
                  {t.loginDescription}
                </p>
              </div>

              {message && (
                <div
                  role={messageType === "error" ? "alert" : "status"}
                  className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    messageType === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-red-400/30 bg-red-400/10 text-red-200"
                  }`}
                >
                  {message}
                </div>
              )}

              <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-bold text-slate-200"
                  >
                    {t.username}
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    disabled={isSubmitting}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder={t.usernamePlaceholder}
                    className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-bold text-slate-200"
                  >
                    {t.password}
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      disabled={isSubmitting}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={t.passwordPlaceholder}
                      className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-4 pr-14 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      aria-label={showPassword ? t.hidePassword : t.showPassword}
                      onClick={() =>
                        setShowPassword((previous) => !previous)
                      }
                      className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl text-lg transition hover:bg-white/10"
                    >
                      {showPassword ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 text-base font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-cyan-500/30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                >
                  {isSubmitting ? t.loggingIn : t.login}
                </button>
              </form>

              <div className="mt-7 border-t border-slate-800 pt-6 text-center">
                <p className="text-sm text-slate-400">
                  {t.noAccount}{" "}
                  <Link
                    href="/register"
                    className="font-black text-cyan-300 transition hover:text-cyan-200"
                  >
                    {t.register}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Hộp chào mừng và luật chơi sau khi đăng nhập */}
      {showWelcomeModal && loggedInUser && (
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
                {t.loginSuccessBadge}
              </span>

              <h2
                id="welcome-title"
                className="mt-3 text-3xl font-black text-white"
              >
                {t.hello} {loggedInUser.name}!
              </h2>

              <p className="mt-2 text-slate-400">@{loggedInUser.username}</p>

              {loggedInUser.role === "admin" && (
                <span className="mt-3 inline-flex rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-300">
                  {t.administrator}
                </span>
              )}
            </div>

            <div className="mt-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-lg font-black text-white">{t.gameRules}</h3>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300 sm:text-base">
                <li className="flex gap-3">
                  <span>1️⃣</span>
                  <span>{t.rule1}</span>
                </li>
                <li className="flex gap-3">
                  <span>2️⃣</span>
                  <span>{t.rule2}</span>
                </li>
                <li className="flex gap-3">
                  <span>3️⃣</span>
                  <span>{t.rule3}</span>
                </li>
                <li className="flex gap-3">
                  <span>4️⃣</span>
                  <span>{t.rule4}</span>
                </li>
                <li className="flex gap-3">
                  <span>5️⃣</span>
                  <span>{t.rule5}</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={closeWelcomeModal}
                className="h-12 rounded-2xl border border-slate-700 bg-slate-900 font-bold text-slate-200 transition hover:bg-slate-800"
              >
                {t.review}
              </button>

              <button
                type="button"
                onClick={continueToGame}
                className="h-12 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-black text-slate-950 transition hover:brightness-110"
              >
                {t.start}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}