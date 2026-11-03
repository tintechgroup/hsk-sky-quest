"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StickerType = "info" | "quiz";
type AdminView = "regions" | "stickers";

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

interface ExploreRegion {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;
  mapX: number;
  mapY: number;
  color: string;
  stickers: ExploreSticker[];
  isActive: boolean;
}

interface RegionForm {
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;
  mapX: string;
  mapY: string;
  color: string;
  stickers: ExploreSticker[];
  isActive: boolean;
}

interface SavedDraft {
  form: RegionForm;
  editingId: string | null;
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

const labelClass = "mb-2 block text-sm font-bold text-slate-200";

function createEmptyForm(): RegionForm {
  return {
    name: "",
    chineseName: "",
    pinyin: "",
    slug: "",
    mapX: "50",
    mapY: "50",
    color: "#34d399",
    stickers: [],
    isActive: true,
  };
}

function getText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getNumber(value: unknown, fallback: number): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function normalizeSticker(value: unknown): ExploreSticker | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) &&
            typeof item === "object" &&
            !Array.isArray(item),
        )
        .map((question) => ({
          id: getText(question.id),
          question: getText(question.question),
          options: Array.isArray(question.options)
            ? question.options.map(getText).slice(0, 4)
            : ["", "", "", ""],
          correctIndex: Math.max(
            0,
            Math.min(3, getNumber(question.correctIndex, 0)),
          ),
          explanation: getText(question.explanation),
        }))
    : [];

  return {
    id: getText(raw.id),
    type: raw.type === "quiz" ? "quiz" : "info",
    title: getText(raw.title),
    icon: getText(raw.icon) || getText(raw.image),
    content: getText(raw.content),
    questions,
    isActive: raw.isActive !== false,
  };
}

function normalizeRegion(value: unknown): ExploreRegion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const id = getText(raw.id) || getText(raw._id);
  const name = getText(raw.name);

  if (!id || !name) return null;

  const stickers = Array.isArray(raw.stickers)
    ? raw.stickers
        .map(normalizeSticker)
        .filter((item): item is ExploreSticker => item !== null)
    : [];

  return {
    id,
    name,
    chineseName: getText(raw.chineseName),
    pinyin: getText(raw.pinyin),
    slug: getText(raw.slug),
    mapX: getNumber(raw.mapX, 50),
    mapY: getNumber(raw.mapY, 50),
    color: getText(raw.color) || "#34d399",
    stickers,
    isActive: raw.isActive !== false,
  };
}

function createSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readDraft(): SavedDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as SavedDraft;
    return draft?.form ? draft : null;
  } catch {
    return null;
  }
}

function saveDraft(draft: SavedDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

interface CoordinatePickerProps {
  mapX: string;
  mapY: string;
  color: string;
  provinceName: string;
  regions: ExploreRegion[];
  editingId: string | null;
  onChange: (x: string, y: string) => void;
}

function CoordinatePicker({
  mapX,
  mapY,
  color,
  provinceName,
  regions,
  editingId,
  onChange,
}: CoordinatePickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  function setPositionFromPointer(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if ((event.target as HTMLElement).closest("[data-map-marker]")) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    onChange(
      Math.max(0, Math.min(100, x)).toFixed(2),
      Math.max(0, Math.min(100, y)).toFixed(2),
    );
  }

  function setPositionFromKeyboard(
    event: React.KeyboardEvent<HTMLDivElement>,
  ) {
    const step = event.shiftKey ? 5 : 1;
    let x = Number(mapX) || 0;
    let y = Number(mapY) || 0;

    if (event.key === "ArrowLeft") x -= step;
    else if (event.key === "ArrowRight") x += step;
    else if (event.key === "ArrowUp") y -= step;
    else if (event.key === "ArrowDown") y += step;
    else return;

    event.preventDefault();
    onChange(
      Math.max(0, Math.min(100, x)).toFixed(2),
      Math.max(0, Math.min(100, y)).toFixed(2),
    );
  }

  const currentX = Math.max(0, Math.min(100, Number(mapX) || 0));
  const currentY = Math.max(0, Math.min(100, Number(mapY) || 0));

  return (
    <section className="mt-6 rounded-2xl border border-emerald-300/15 bg-[#071a28] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-black text-white">Chọn tọa độ trên bản đồ</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Bấm vào khung để đặt ghim. Có thể dùng phím mũi tên để dịch chuyển
            ghim sau khi chọn khung.
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/15 bg-emerald-300/5 px-3 py-1.5 text-xs font-bold text-emerald-100">
          X: {currentX.toFixed(2)} · Y: {currentY.toFixed(2)}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className={labelClass}>Tọa độ X (0–100)</span>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={mapX}
            onChange={(event) => onChange(event.target.value, mapY)}
          />
        </label>

        <label>
          <span className={labelClass}>Tọa độ Y (0–100)</span>
          <input
            className={inputClass}
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={mapY}
            onChange={(event) => onChange(mapX, event.target.value)}
          />
        </label>
      </div>

      <div className="mb-2 mt-5 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-200">Chọn vị trí</span>
        <span className="text-xs text-slate-500">Bấm vào khung</span>
      </div>

      <div
        ref={mapRef}
        role="button"
        tabIndex={0}
        aria-label="Khung chọn tọa độ tỉnh. Bấm hoặc dùng phím mũi tên để đặt ghim."
        onPointerDown={setPositionFromPointer}
        onKeyDown={setPositionFromKeyboard}
        className="relative aspect-[1.55/1] w-full touch-manipulation select-none overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#061a27] outline-none transition focus:border-emerald-300 sm:aspect-[2.35/1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(111, 211, 216, .055) 1px, transparent 1px), linear-gradient(90deg, rgba(111, 211, 216, .055) 1px, transparent 1px), radial-gradient(ellipse at 55% 48%, rgba(34, 155, 147, .18), transparent 60%)",
          backgroundSize: "7.5% 12.5%, 7.5% 12.5%, auto",
          cursor: "crosshair",
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-white/[.07]" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/[.09]" />
          <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-white/[.07]" />
          <div className="absolute inset-y-0 left-1/4 border-l border-dashed border-white/[.07]" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-white/[.09]" />
          <div className="absolute inset-y-0 left-3/4 border-l border-dashed border-white/[.07]" />
        </div>

        <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-400">
          0, 0
        </div>
        <div className="pointer-events-none absolute right-2 top-2 rounded-md bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-400">
          100, 0
        </div>
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-400">
          0, 100
        </div>
        <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-black/30 px-2 py-1 text-[9px] font-bold text-slate-400">
          100, 100
        </div>

        {regions
          .filter((region) => region.id !== editingId)
          .map((region) => (
            <span
              key={region.id}
              data-map-marker
              title={`${region.name} · X ${region.mapX}, Y ${region.mapY}`}
              className="absolute z-10 grid size-3 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/80 shadow-[0_0_12px_rgba(0,0,0,.5)]"
              style={{
                left: `${region.mapX}%`,
                top: `${region.mapY}%`,
                backgroundColor: region.color,
              }}
            />
          ))}

        <span
          data-map-marker
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${currentX}%`, top: `${currentY}%` }}
        >
          <span
            className="block size-5 rounded-full border-[3px] border-white shadow-[0_0_0_5px_rgba(255,255,255,.18),0_0_24px_rgba(74,236,195,.8)]"
            style={{ backgroundColor: color }}
          />
          <span className="absolute left-1/2 top-6 max-w-32 -translate-x-1/2 truncate rounded-lg border border-white/10 bg-[#020b13]/95 px-2 py-1 text-[10px] font-black text-white shadow-lg">
            {provinceName.trim() || "Tỉnh mới"}
          </span>
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2.5 rounded-full border border-white/70"
            style={{ backgroundColor: color }}
          />
          Tỉnh đang chọn
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full border border-white/70 bg-slate-400" />
          Tỉnh đã có
        </span>
        <span className="ml-auto">
          X tăng từ trái sang phải · Y tăng từ trên xuống
        </span>
      </div>
    </section>
  );
}

function AdminExploreRegionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedView: AdminView =
    searchParams.get("view") === "stickers" ? "stickers" : "regions";
  const stickerSaved = searchParams.get("stickerSaved");

  const [regions, setRegions] = useState<ExploreRegion[]>([]);
  const [form, setForm] = useState<RegionForm>(createEmptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRegions = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/explore-regions", {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không tải được danh sách tỉnh.");
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      const loadedRegions = rows
        .map(normalizeRegion)
        .filter((item): item is ExploreRegion => item !== null);

      setRegions(loadedRegions);
      return loadedRegions;
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không tải được danh sách tỉnh.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      const draft = readDraft();

      if (draft) {
        setForm(draft.form);
        setEditingId(draft.editingId);
        setSelectedRegionId(draft.editingId || "");
      }

      setDraftReady(true);
      void loadRegions();
    });

    return () => {
      cancelled = true;
    };
  }, [loadRegions]);

  useEffect(() => {
    if (!draftReady) return;
    saveDraft({ form, editingId });
  }, [draftReady, form, editingId]);

  useEffect(() => {
    if (!draftReady || stickerSaved !== "1") return;

    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;

      try {
        const raw = sessionStorage.getItem(PENDING_STICKER_KEY);

        if (raw) {
          const pending = JSON.parse(raw) as { sticker?: ExploreSticker };

          if (pending.sticker) {
            setForm((current) => {
              const exists = current.stickers.some(
                (sticker) => sticker.id === pending.sticker?.id,
              );

              return {
                ...current,
                stickers: exists
                  ? current.stickers.map((sticker) =>
                      sticker.id === pending.sticker?.id
                        ? pending.sticker!
                        : sticker,
                    )
                  : [...current.stickers, pending.sticker!],
              };
            });

            setMessage(
              "Sticker đã được thêm vào bản nháp. Bấm lưu để cập nhật tỉnh.",
            );
          }
        }
      } catch {
        setError("Không đọc được sticker vừa tạo. Hãy thử lại.");
      } finally {
        sessionStorage.removeItem(PENDING_STICKER_KEY);
        router.replace("/admin/explore-regions?view=stickers");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [draftReady, router, stickerSaved]);

  const selectedRegion = regions.find(
    (region) => region.id === selectedRegionId,
  );

  const stickersForCurrentRegion =
    editingId && selectedRegionId === editingId
      ? form.stickers
      : selectedRegion?.stickers ?? [];

  const infoStickers = stickersForCurrentRegion.filter(
    (sticker) => sticker.type === "info",
  );
  const quizStickers = stickersForCurrentRegion.filter(
    (sticker) => sticker.type === "quiz",
  );

  function updateField<K extends keyof RegionForm>(
    key: K,
    value: RegionForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateCoordinates(x: string, y: string) {
    setForm((current) => ({ ...current, mapX: x, mapY: y }));
  }

  function startEdit(region: ExploreRegion) {
    setEditingId(region.id);
    setSelectedRegionId(region.id);
    setError("");
    setMessage("");

    setForm({
      name: region.name,
      chineseName: region.chineseName,
      pinyin: region.pinyin,
      slug: region.slug,
      mapX: String(region.mapX),
      mapY: String(region.mapY),
      color: region.color,
      stickers: region.stickers,
      isActive: region.isActive,
    });
  }

  function selectRegionForStickers(regionId: string) {
    setSelectedRegionId(regionId);
    setError("");
    setMessage("");

    if (!regionId) {
      setEditingId(null);
      setForm(createEmptyForm());
      return;
    }

    const region = regions.find((item) => item.id === regionId);
    if (region) startEdit(region);
  }

  function openStickerEditor(type: StickerType, stickerId?: string) {
    if (!editingId || !selectedRegionId) {
      setError("Chọn tỉnh cần thêm sticker trước.");
      return;
    }

    try {
      saveDraft({ form, editingId });

      const query = new URLSearchParams({ type });
      if (stickerId) query.set("stickerId", stickerId);

      router.push(
        `/admin/explore-regions/sticker-editor?${query.toString()}`,
      );
    } catch {
      setError("Không lưu được bản nháp tỉnh. Hãy thử lại.");
    }
  }

  function removeSticker(stickerId: string) {
    setForm((current) => ({
      ...current,
      stickers: current.stickers.filter(
        (sticker) => sticker.id !== stickerId,
      ),
    }));
    setMessage("Sticker đã gỡ khỏi bản nháp. Bấm lưu tỉnh để xác nhận.");
  }

  function cancelEdit() {
    setEditingId(null);
    setSelectedRegionId("");
    setForm(createEmptyForm());
    setError("");
    setMessage("");
    sessionStorage.removeItem(DRAFT_KEY);
  }

  async function handleSaveRegion() {
    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Nhập tên tỉnh trước khi lưu.");
      return;
    }

    const x = Number(form.mapX);
    const y = Number(form.mapY);

    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 100 ||
      y < 0 ||
      y > 100
    ) {
      setError("Tọa độ X và Y phải nằm trong khoảng từ 0 đến 100.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        chineseName: form.chineseName.trim(),
        pinyin: form.pinyin.trim(),
        slug: form.slug.trim() || createSlug(form.name),
        mapX: x,
        mapY: y,
        color: form.color,
        stickers: form.stickers,
        isActive: form.isActive,
      };

      const response = await fetch(
        editingId
          ? `/api/explore-regions/${editingId}`
          : "/api/explore-regions",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không lưu được tỉnh.");
      }

      const savedRegionId = editingId;
      const keepStickerView =
        requestedView === "stickers" && Boolean(savedRegionId);

      setMessage(
        result.message || `Đã lưu tỉnh và ${form.stickers.length} sticker.`,
      );

      if (keepStickerView && savedRegionId) {
        const refreshedRegions = await loadRegions();
        const savedRegion = refreshedRegions.find(
          (region) => region.id === savedRegionId,
        );

        // Giữ tỉnh đang chọn sau khi lưu để danh sách sticker vẫn hiện trên màn hình.
        setSelectedRegionId(savedRegionId);
        setEditingId(savedRegionId);

        if (savedRegion) {
          const savedForm: RegionForm = {
            name: savedRegion.name,
            chineseName: savedRegion.chineseName,
            pinyin: savedRegion.pinyin,
            slug: savedRegion.slug,
            mapX: String(savedRegion.mapX),
            mapY: String(savedRegion.mapY),
            color: savedRegion.color,
            stickers: savedRegion.stickers,
            isActive: savedRegion.isActive,
          };

          setForm(savedForm);
          saveDraft({
            editingId: savedRegion.id,
            form: savedForm,
          });
        }
      } else {
        setEditingId(null);
        setSelectedRegionId("");
        setForm(createEmptyForm());
        sessionStorage.removeItem(DRAFT_KEY);
        await loadRegions();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Không lưu được tỉnh.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function hideRegion(region: ExploreRegion) {
    if (
      !window.confirm(
        `Ẩn tỉnh “${region.name}” khỏi bản đồ? Dữ liệu vẫn được giữ trong Admin.`,
      )
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/explore-regions/${region.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không ẩn được tỉnh.");
      }

      setMessage(result.message || "Đã ẩn tỉnh.");
      await loadRegions();
    } catch (hideError) {
      setError(
        hideError instanceof Error ? hideError.message : "Không ẩn được tỉnh.",
      );
    }
  }

  function renderStickerCard(sticker: ExploreSticker) {
    return (
      <article
        key={sticker.id}
        className="flex min-w-0 gap-3 rounded-2xl border border-white/10 bg-[#0b2538] p-3 sm:p-4"
      >
        {sticker.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sticker.icon}
            alt={sticker.title}
            className="size-16 shrink-0 rounded-xl border border-white/10 object-cover sm:size-20"
          />
        ) : (
          <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl sm:size-20">
            🖼️
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {sticker.type === "quiz"
              ? "Mở câu hỏi trắc nghiệm"
              : "Mở bong bóng nội dung"}
          </p>
          <h3 className="mt-1 truncate font-black">
            {sticker.title || "Chưa đặt tên"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {sticker.type === "quiz"
              ? `${sticker.questions.length} câu hỏi`
              : "Sticker nội dung tỉnh"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openStickerEditor(sticker.type, sticker.id)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/5"
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => removeSticker(sticker.id)}
              className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-300/10"
            >
              Gỡ
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#04131f] px-4 py-6 text-white sm:px-7 sm:py-8 lg:px-10">
      <div className="w-full">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-emerald-300">
              ADMIN · KHÁM PHÁ TRUNG QUỐC
            </p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              {requestedView === "stickers"
                ? "Quản lý sticker tỉnh"
                : "Quản lý tỉnh khám phá"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {requestedView === "stickers"
                ? "Chọn tỉnh, sau đó chọn loại sticker cần thêm hoặc chỉnh sửa."
                : "Dữ liệu tỉnh khám phá được quản lý riêng với dữ liệu trong trò chơi."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/explore-china"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              Xem bản đồ
            </Link>
            <Link
              href={
                requestedView === "stickers"
                  ? "/admin/explore-regions"
                  : "/admin/explore-regions?view=stickers"
              }
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
            >
              {requestedView === "stickers" ? "Quản lý tỉnh" : "Sticker tỉnh"}
            </Link>
          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {requestedView === "stickers" ? (
          <>
            <section className="rounded-3xl border border-white/10 bg-[#081e2e] p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    Chọn tỉnh cần quản lý sticker
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Sticker được lưu cùng tỉnh đã chọn.
                  </p>
                </div>

                <label className="block w-full sm:w-80">
                  <span className={labelClass}>Tỉnh/thành</span>
                  <select
                    className={inputClass}
                    value={selectedRegionId}
                    onChange={(event) =>
                      selectRegionForStickers(event.target.value)
                    }
                  >
                    <option value="">Chọn tỉnh...</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.name}
                        {region.chineseName ? ` · ${region.chineseName}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-2">
              <article className="flex flex-col rounded-3xl border border-cyan-200/20 bg-gradient-to-br from-cyan-300/[.09] to-[#081e2e] p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-2xl">
                    💬
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-[.16em] text-cyan-200">
                      LOẠI 1
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Sticker nội dung tỉnh
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Bấm ảnh sticker để mở nội dung trong bong bóng chat. Loại
                      này không có câu hỏi trắc nghiệm.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-cyan-200/10 bg-black/10 p-4">
                  <p className="text-sm font-bold text-slate-100">
                    {selectedRegion
                      ? `${infoStickers.length} sticker nội dung tại ${selectedRegion.name}`
                      : "Chọn tỉnh để xem sticker nội dung"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Mỗi sticker có ảnh và phần giới thiệu riêng.
                  </p>
                </div>

                {selectedRegion && infoStickers.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    {infoStickers.map(renderStickerCard)}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!selectedRegion || !editingId}
                  onClick={() => openStickerEditor("info")}
                  className="mt-5 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Thêm sticker nội dung
                </button>
              </article>

              <article className="flex flex-col rounded-3xl border border-amber-200/20 bg-gradient-to-br from-amber-300/[.08] to-[#081e2e] p-5 sm:p-7">
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-300/10 text-2xl">
                    ❓
                  </span>
                  <div>
                    <p className="text-[10px] font-black tracking-[.16em] text-amber-200">
                      LOẠI 2
                    </p>
                    <h2 className="mt-1 text-xl font-black">
                      Sticker trắc nghiệm
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Bấm ảnh sticker để mở bài kiểm tra chọn A, B, C, D và xem
                      tổng kết điểm.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200/10 bg-black/10 p-4">
                  <p className="text-sm font-bold text-slate-100">
                    {selectedRegion
                      ? `${quizStickers.length} sticker trắc nghiệm tại ${selectedRegion.name}`
                      : "Chọn tỉnh để xem sticker trắc nghiệm"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Mỗi sticker có ảnh và bộ câu hỏi riêng.
                  </p>
                </div>

                {selectedRegion && quizStickers.length > 0 && (
                  <div className="mt-4 grid gap-3">
                    {quizStickers.map(renderStickerCard)}
                  </div>
                )}

                <button
                  type="button"
                  disabled={!selectedRegion || !editingId}
                  onClick={() => openStickerEditor("quiz")}
                  className="mt-5 rounded-xl border border-amber-200/20 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100 transition hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Thêm sticker trắc nghiệm
                </button>
              </article>
            </section>

            {selectedRegion && editingId && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#081e2e] p-4">
                <p className="text-sm text-slate-300">
                  Đang chỉnh sửa sticker của{" "}
                  <strong>{selectedRegion.name}</strong>. Lưu tỉnh để xác nhận.
                </p>
                <button
                  type="button"
                  onClick={() => void handleSaveRegion()}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-60"
                >
                  {saving ? "Đang lưu..." : "Lưu tỉnh và sticker"}
                </button>
              </div>
            )}

            {!selectedRegion && !loading && regions.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-white/15 p-6 text-center">
                <p className="font-bold">Chưa có tỉnh khám phá</p>
                <p className="mt-2 text-sm text-slate-400">
                  Tạo tỉnh trước, sau đó quay lại đây để thêm sticker.
                </p>
                <Link
                  href="/admin/explore-regions"
                  className="mt-4 inline-flex rounded-xl bg-emerald-300 px-4 py-2.5 text-sm font-black text-slate-950"
                >
                  + Thêm tỉnh
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <section className="rounded-3xl border border-white/10 bg-[#081e2e] p-5 sm:p-7">
              <div className="mb-6">
                <h2 className="text-xl font-black">
                  {editingId ? "Chỉnh sửa tỉnh" : "Thêm tỉnh mới"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Nhập thông tin tỉnh, rồi bấm vào khung tọa độ để đặt vị trí ghim.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label>
                  <span className={labelClass}>Tên tỉnh *</span>
                  <input
                    className={inputClass}
                    value={form.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      setForm((current) => ({
                        ...current,
                        name,
                        slug: current.slug || createSlug(name),
                      }));
                    }}
                    placeholder="Ví dụ: Hà Bắc"
                  />
                </label>

                <label>
                  <span className={labelClass}>Tên tiếng Trung</span>
                  <input
                    className={inputClass}
                    value={form.chineseName}
                    onChange={(event) =>
                      updateField("chineseName", event.target.value)
                    }
                    placeholder="河北"
                  />
                </label>

                <label>
                  <span className={labelClass}>Pinyin</span>
                  <input
                    className={inputClass}
                    value={form.pinyin}
                    onChange={(event) =>
                      updateField("pinyin", event.target.value)
                    }
                    placeholder="Héběi"
                  />
                </label>

                <label>
                  <span className={labelClass}>Slug</span>
                  <input
                    className={inputClass}
                    value={form.slug}
                    onChange={(event) =>
                      updateField("slug", event.target.value)
                    }
                    placeholder="ha-bac"
                  />
                </label>

                <label>
                  <span className={labelClass}>Màu điểm tỉnh</span>
                  <input
                    className={`${inputClass} h-12 p-1`}
                    type="color"
                    value={form.color}
                    onChange={(event) =>
                      updateField("color", event.target.value)
                    }
                  />
                </label>
              </div>

              <CoordinatePicker
                mapX={form.mapX}
                mapY={form.mapY}
                color={form.color}
                provinceName={form.name}
                regions={regions}
                editingId={editingId}
                onChange={updateCoordinates}
              />

              <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  className="size-4 accent-emerald-400"
                />
                Hiển thị tỉnh trên bản đồ
              </label>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveRegion()}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-emerald-300 to-cyan-300 px-6 py-3.5 text-sm font-black text-slate-950 disabled:opacity-60"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu tỉnh"
                      : "Thêm tỉnh vào bản đồ"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-xl border border-white/10 px-5 py-3.5 text-sm font-bold transition hover:bg-white/5"
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-[#081e2e] p-5 sm:p-7">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Danh sách tỉnh khám phá</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {regions.length} tỉnh trong bộ dữ liệu riêng.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadRegions()}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold transition hover:bg-white/5"
                >
                  Tải lại
                </button>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Đang tải danh sách...
                </p>
              ) : regions.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Chưa có tỉnh khám phá.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {regions.map((region) => (
                    <article
                      key={region.id}
                      className="rounded-2xl border border-white/10 bg-[#0b2538] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1 size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: region.color }}
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black">
                            {region.name}
                            {region.chineseName && (
                              <span className="ml-2 font-medium text-slate-400">
                                {region.chineseName}
                              </span>
                            )}
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {region.pinyin || "Chưa có pinyin"} · X{" "}
                            {region.mapX}, Y {region.mapY} ·{" "}
                            {region.stickers.length} sticker
                          </p>
                          <span
                            className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              region.isActive
                                ? "bg-emerald-300/10 text-emerald-200"
                                : "bg-slate-500/20 text-slate-300"
                            }`}
                          >
                            {region.isActive ? "Đang hiển thị" : "Đang ẩn"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                        <button
                          type="button"
                          onClick={() => startEdit(region)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold transition hover:bg-white/5"
                        >
                          Sửa tỉnh
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startEdit(region);
                            router.push("/admin/explore-regions?view=stickers");
                          }}
                          className="rounded-lg border border-cyan-200/20 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/10"
                        >
                          Quản lý sticker
                        </button>
                        {region.isActive && (
                          <button
                            type="button"
                            onClick={() => void hideRegion(region)}
                            className="rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-300/10"
                          >
                            Ẩn khỏi bản đồ
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export default function AdminExploreRegionsPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#04131f] text-sm text-slate-300">
          Đang mở quản lý tỉnh khám phá...
        </main>
      }
    >
      <AdminExploreRegionsContent />
    </Suspense>
  );
}