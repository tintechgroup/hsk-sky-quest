"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StickerType = "info" | "quiz";

interface ExploreQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ExploreSticker {
  id: string;
  type: StickerType;
  title: string;
  icon: string;
  content: string;
  questions: ExploreQuestion[];
  isActive: boolean;
}

interface RegionDraft {
  form?: {
    stickers?: ExploreSticker[];
  };
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

const DRAFT_KEY = "explore-region-admin-draft-v1";
const PENDING_STICKER_KEY = "explore-region-pending-sticker-v1";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-[#0b2538] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10";

const textareaClass =
  "w-full resize-y rounded-xl border border-white/10 bg-[#0b2538] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10";

const labelClass = "mb-2 block text-sm font-bold text-slate-200";

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createQuestion(): ExploreQuestion {
  return {
    id: makeId(),
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  };
}

function getText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function ExploreStickerEditorPage() {
  const router = useRouter();

  const [type, setType] = useState<StickerType>("info");
  const [stickerId, setStickerId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [content, setContent] = useState("");
  const [questions, setQuestions] = useState<ExploreQuestion[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      const params = new URLSearchParams(window.location.search);
      const queryType: StickerType =
        params.get("type") === "quiz" ? "quiz" : "info";
      const queryStickerId = params.get("stickerId");

      setType(queryType);
      setStickerId(queryStickerId);

      if (queryType === "quiz") {
        setTitle("Thử thách trắc nghiệm");
        setQuestions([createQuestion()]);
      } else {
        setTitle("Sticker nội dung");
        setQuestions([]);
      }

      try {
        const rawDraft = sessionStorage.getItem(DRAFT_KEY);

        if (rawDraft && queryStickerId) {
          const draft = JSON.parse(rawDraft) as RegionDraft;
          const existingSticker = draft.form?.stickers?.find(
            (sticker) => sticker.id === queryStickerId,
          );

          if (existingSticker) {
            setType(existingSticker.type);
            setStickerId(existingSticker.id);
            setTitle(existingSticker.title);
            setImageUrl(existingSticker.icon);
            setContent(existingSticker.content);
            setQuestions(existingSticker.questions);
            setIsActive(existingSticker.isActive);
          }
        }
      } catch {
        setError("Không đọc được bản nháp hiện tại.");
      }

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function updateQuestion(
    questionId: string,
    changes: Partial<ExploreQuestion>,
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, ...changes }
          : question,
      ),
    );
  }

  function updateOption(
    questionId: string,
    optionIndex: number,
    value: string,
  ) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const options = [...question.options];
        options[optionIndex] = value;

        return { ...question, options };
      }),
    );
  }

  function addQuestion() {
    setQuestions((current) => [...current, createQuestion()]);
  }

  function removeQuestion(questionId: string) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );
  }

  async function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Chọn ảnh JPG, PNG, WEBP hoặc GIF.");
      setSuccessMessage("");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh cần có dung lượng không quá 5 MB.");
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/explore-regions/upload", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không tải được ảnh.");
      }

      const data =
        result.data && typeof result.data === "object"
          ? (result.data as Record<string, unknown>)
          : {};

      const uploadedUrl = getText(data.url);

      if (!uploadedUrl) {
        throw new Error("API tải ảnh không trả về đường dẫn ảnh.");
      }

      setImageUrl(uploadedUrl);
      setSuccessMessage("Đã tải ảnh. Bấm lưu để thêm ảnh vào sticker.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Không tải được ảnh sticker.",
      );
    } finally {
      setUploading(false);
    }
  }

  function handleSaveSticker() {
    setError("");
    setSuccessMessage("");

    if (!title.trim()) {
      setError("Nhập tên sticker.");
      return;
    }

    if (!imageUrl) {
      setError("Chọn ảnh sticker từ máy trước khi lưu.");
      return;
    }

    if (type === "info" && !content.trim()) {
      setError("Nhập nội dung sẽ hiện trong bong bóng chat.");
      return;
    }

    if (type === "quiz") {
      if (questions.length === 0) {
        setError("Sticker trắc nghiệm cần ít nhất một câu hỏi.");
        return;
      }

      for (const [index, question] of questions.entries()) {
        if (!question.question.trim()) {
          setError(`Câu ${index + 1} chưa có nội dung.`);
          return;
        }

        if (question.options.some((option) => !option.trim())) {
          setError(`Câu ${index + 1} cần đủ bốn đáp án.`);
          return;
        }
      }
    }

    const sticker: ExploreSticker = {
      id: stickerId || makeId(),
      type,
      title: title.trim(),
      icon: imageUrl,
      content: type === "info" ? content.trim() : "",
      questions: type === "quiz" ? questions : [],
      isActive,
    };

    try {
      sessionStorage.setItem(
        PENDING_STICKER_KEY,
        JSON.stringify({ sticker }),
      );

      router.push("/admin/explore-regions?stickerSaved=1");
    } catch {
      setError("Không lưu được bản nháp sticker trong trình duyệt.");
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen w-full place-items-center bg-[#04131f] text-white">
        <p className="text-sm text-slate-300">
          Đang mở trình biên tập...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#04131f] px-4 py-6 text-white sm:px-7 sm:py-8 lg:px-10 xl:px-12">
      <div className="w-full">
        <header className="mb-6 flex w-full flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-emerald-300">
              ADMIN · BIÊN TẬP STICKER
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {stickerId ? "Chỉnh sửa sticker" : "Tạo sticker mới"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {type === "quiz"
                ? "Tải ảnh sticker, nhập câu hỏi và chọn đáp án đúng."
                : "Tải ảnh sticker và nhập nội dung tỉnh."}
            </p>
          </div>

          <Link
            href="/admin/explore-regions"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
          >
            ← Quay lại tỉnh
          </Link>
        </header>

        {error && (
          <div className="mb-5 w-full rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-5 w-full rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        )}

        <section className="w-full rounded-3xl border border-white/10 bg-[#081e2e] p-5 sm:p-7 lg:p-8">
          <div className="mb-7 flex items-center gap-4">
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xl ${
                type === "quiz"
                  ? "bg-amber-300/10"
                  : "bg-cyan-300/10"
              }`}
            >
              {type === "quiz" ? "❓" : "💬"}
            </span>
            <div>
              <h2 className="text-lg font-black">
                {type === "quiz"
                  ? "Sticker trắc nghiệm"
                  : "Sticker nội dung tỉnh"}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Nhập các thông tin cần thiết rồi lưu sticker vào bản nháp tỉnh.
              </p>
            </div>
          </div>

          <div
            className={`mb-7 rounded-2xl border px-4 py-4 ${
              type === "quiz"
                ? "border-amber-200/20 bg-amber-300/[.06]"
                : "border-cyan-200/20 bg-cyan-300/[.06]"
            }`}
          >
            <p
              className={`text-sm font-black ${
                type === "quiz" ? "text-amber-100" : "text-cyan-100"
              }`}
            >
              {type === "quiz"
                ? "Sticker này mở bài trắc nghiệm riêng."
                : "Sticker này mở bong bóng chat riêng."}
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {type === "quiz"
                ? "Người dùng bấm ảnh sticker để trả lời các câu hỏi A, B, C, D. Nội dung chat không thuộc loại sticker này."
                : "Người dùng bấm ảnh sticker để đọc nội dung tỉnh. Sticker này không chứa câu hỏi trắc nghiệm."}
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-7 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-9">
            <div className="w-full">
              <label className={labelClass}>Ảnh sticker *</label>

              <div className="grid min-h-[280px] w-full place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-slate-950/30">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt={title || "Ảnh sticker"}
                    className="max-h-[420px] w-full object-contain"
                  />
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-5xl">🖼️</div>
                    <p className="mt-4 text-sm font-semibold text-slate-300">
                      Chưa chọn ảnh
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ảnh xem trước sẽ hiện ở đây
                    </p>
                  </div>
                )}
              </div>

              <label className="mt-3 block w-full cursor-pointer rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-center text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15">
                {uploading
                  ? "Đang tải ảnh..."
                  : imageUrl
                    ? "Chọn ảnh khác"
                    : "Chọn ảnh từ máy"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => void handleImageChange(event)}
                />
              </label>

              <p className="mt-2 text-center text-xs text-slate-500">
                JPG, PNG, WEBP hoặc GIF · tối đa 5 MB
              </p>
            </div>

            <div className="min-w-0 space-y-5">
              <label className="block">
                <span className={labelClass}>Tên sticker *</span>
                <input
                  className={inputClass}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    type === "quiz"
                      ? "Ví dụ: Thử thách lịch sử"
                      : "Ví dụ: Đặc sản địa phương"
                  }
                />
              </label>

              {type === "info" ? (
                <label className="block">
                  <span className={labelClass}>
                    Nội dung bong bóng chat *
                  </span>
                  <textarea
                    className={`${textareaClass} min-h-56`}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="Nhập nội dung sẽ hiện khi người dùng bấm sticker..."
                  />
                </label>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-amber-100">
                        Câu hỏi ({questions.length})
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        Mỗi câu có bốn đáp án A, B, C, D.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="rounded-xl border border-amber-200/20 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/15"
                    >
                      + Thêm câu hỏi
                    </button>
                  </div>

                  {questions.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/15 p-7 text-center text-sm text-slate-400">
                      Chưa có câu hỏi. Bấm “Thêm câu hỏi” để bắt đầu.
                    </div>
                  )}

                  {questions.map((question, questionIndex) => (
                    <article
                      key={question.id}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/20 p-4 sm:p-5"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                          Câu {questionIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuestion(question.id)}
                          className="rounded-lg px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-300/10"
                        >
                          Xóa câu hỏi
                        </button>
                      </div>

                      <label className="block">
                        <span className={labelClass}>
                          Nội dung câu hỏi *
                        </span>
                        <textarea
                          className={`${textareaClass} min-h-24`}
                          value={question.question}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              question: event.target.value,
                            })
                          }
                          placeholder="Nhập nội dung câu hỏi..."
                        />
                      </label>

                      <div className="mt-5 grid gap-4 xl:grid-cols-2">
                        {question.options.map((option, optionIndex) => {
                          const letter = String.fromCharCode(
                            65 + optionIndex,
                          );
                          const isCorrect =
                            question.correctIndex === optionIndex;

                          return (
                            <div
                              key={`${question.id}-${letter}`}
                              className={`rounded-xl border p-4 ${
                                isCorrect
                                  ? "border-emerald-300/40 bg-emerald-300/[.06]"
                                  : "border-white/10 bg-[#0b2538]"
                              }`}
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm font-black text-slate-200">
                                  Đáp án {letter}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(question.id, {
                                      correctIndex: optionIndex,
                                    })
                                  }
                                  className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                                    isCorrect
                                      ? "bg-emerald-300 text-slate-950"
                                      : "bg-white/5 text-slate-400 hover:bg-white/10"
                                  }`}
                                >
                                  {isCorrect
                                    ? "ĐÁP ÁN ĐÚNG"
                                    : "Chọn là đáp án đúng"}
                                </button>
                              </div>

                              <input
                                className={inputClass}
                                value={option}
                                onChange={(event) =>
                                  updateOption(
                                    question.id,
                                    optionIndex,
                                    event.target.value,
                                  )
                                }
                                placeholder={`Nhập đáp án ${letter}`}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <label className="mt-5 block">
                        <span className={labelClass}>
                          Giải thích đáp án
                        </span>
                        <textarea
                          className={`${textareaClass} min-h-24`}
                          value={question.explanation}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              explanation: event.target.value,
                            })
                          }
                          placeholder="Có thể để trống..."
                        />
                      </label>
                    </article>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="size-4 accent-emerald-400"
                />
                Hiển thị sticker
              </label>
            </div>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveSticker}
            disabled={uploading}
            className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stickerId
              ? type === "quiz"
                ? "Cập nhật sticker trắc nghiệm vào bản nháp tỉnh"
                : "Cập nhật sticker nội dung vào bản nháp tỉnh"
              : type === "quiz"
                ? "Thêm sticker trắc nghiệm vào bản nháp tỉnh"
                : "Thêm sticker nội dung vào bản nháp tỉnh"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/explore-regions")}
            className="rounded-xl border border-white/10 px-5 py-3.5 text-sm font-bold text-slate-200 transition hover:bg-white/5"
          >
            Hủy và quay lại
          </button>
        </div>
      </div>
    </main>
  );
}