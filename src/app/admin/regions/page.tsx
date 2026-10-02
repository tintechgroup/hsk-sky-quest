"use client";

import Link from "next/link";

import {
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface RegionItem {
  id: string;

  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;

  geography: string;
  culture: string;
  landmark: string;

  mapX: number;
  mapY: number;

  flightOrder: number;

  color: string;

  isActive: boolean;

  createdAt?: string | null;
  updatedAt?: string | null;
}

interface RegionForm {
  name: string;

  chineseName: string;

  pinyin: string;

  slug: string;

  geography: string;

  culture: string;

  landmark: string;

  mapX: string;

  mapY: string;

  flightOrder: string;

  color: string;

  isActive: boolean;
}

interface ApiResponse {
  success?: boolean;

  message?: string;

  data?: unknown;

  total?: number;
}

type StatusFilter =
  | "all"
  | "active"
  | "inactive";

const inputClassName =
  "min-h-12 w-full rounded-xl border border-white/10 bg-[#0d2c40] px-4 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50";

const textAreaClassName =
  "w-full resize-y rounded-xl border border-white/10 bg-[#0d2c40] p-4 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300 focus:ring-4 focus:ring-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-50";

function createEmptyForm(
  flightOrder = 0,
): RegionForm {
  return {
    name: "",

    chineseName: "",

    pinyin: "",

    slug: "",

    geography: "",

    culture: "",

    landmark: "",

    mapX: "50",

    mapY: "50",

    flightOrder:
      String(flightOrder),

    color: "#34d399",

    isActive: true,
  };
}

function createSlug(
  value: string,
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-",
    )
    .replace(
      /^-+|-+$/g,
      "",
    );
}

function getString(
  value: unknown,
) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function getNumber(
  value: unknown,
  fallback = 0,
) {
  const number =
    Number(value);

  return Number.isFinite(
    number,
  )
    ? number
    : fallback;
}

function normalizeRegion(
  value: unknown,
): RegionItem | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const raw =
    value as Record<
      string,
      unknown
    >;

  const id =
    getString(raw.id) ||
    getString(raw._id);

  const name =
    getString(raw.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,

    name,

    chineseName:
      getString(
        raw.chineseName,
      ),

    pinyin:
      getString(raw.pinyin),

    slug:
      getString(raw.slug),

    geography:
      getString(
        raw.geography,
      ),

    culture:
      getString(raw.culture),

    landmark:
      getString(
        raw.landmark,
      ),

    mapX:
      getNumber(
        raw.mapX,
        50,
      ),

    mapY:
      getNumber(
        raw.mapY,
        50,
      ),

    flightOrder:
      getNumber(
        raw.flightOrder,
        0,
      ),

    color:
      getString(
        raw.color,
      ) || "#34d399",

    isActive:
      raw.isActive !==
      false,

    createdAt:
      typeof raw.createdAt ===
      "string"
        ? raw.createdAt
        : null,

    updatedAt:
      typeof raw.updatedAt ===
      "string"
        ? raw.updatedAt
        : null,
  };
}

function getNextFlightOrder(
  regions: RegionItem[],
) {
  if (
    regions.length === 0
  ) {
    return 0;
  }

  return (
    Math.max(
      ...regions.map(
        (region) =>
          region.flightOrder,
      ),
    ) + 1
  );
}

async function readResponse(
  response: Response,
): Promise<ApiResponse> {
  try {
    return await response.json();
  } catch {
    return {
      success: false,

      message:
        "Máy chủ trả về dữ liệu không hợp lệ.",
    };
  }
}

export default function AdminRegionsPage() {
  const [
    regions,
    setRegions,
  ] =
    useState<RegionItem[]>(
      [],
    );

  const [
    form,
    setForm,
  ] = useState<RegionForm>(
    createEmptyForm(),
  );

  const [
    editingRegionId,
    setEditingRegionId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    processingRegionId,
    setProcessingRegionId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isAuthorized,
    setIsAuthorized,
  ] = useState(true);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all",
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  function clearMessages() {
    setErrorMessage("");

    setSuccessMessage("");
  }

  const loadRegions =
    useCallback(async () => {
      try {
        setIsLoading(true);

        setErrorMessage("");

        const response =
          await fetch(
            "/api/regions?scope=admin",
            {
              method:
                "GET",

              credentials:
                "include",

              cache:
                "no-store",

              headers: {
                Accept:
                  "application/json",
              },
            },
          );

        const result =
          await readResponse(
            response,
          );

        if (
          response.status ===
            401 ||
          response.status ===
            403
        ) {
          setIsAuthorized(
            false,
          );

          setRegions([]);

          setErrorMessage(
            result.message ||
              "Bạn không có quyền quản trị tỉnh.",
          );

          return [];
        }

        if (
          !response.ok ||
          result.success !==
            true
        ) {
          throw new Error(
            result.message ||
              "Không thể tải danh sách tỉnh.",
          );
        }

        const rawRegions =
          Array.isArray(
            result.data,
          )
            ? result.data
            : [];

        const normalizedRegions =
          rawRegions
            .map(
              normalizeRegion,
            )
            .filter(
              (
                region,
              ): region is RegionItem =>
                region !== null,
            );

        setRegions(
          normalizedRegions,
        );

        setIsAuthorized(
          true,
        );

        return normalizedRegions;
      } catch (error) {
        console.error(
          "GET /api/regions?scope=admin:",
          error,
        );

        setRegions([]);

        setErrorMessage(
          error instanceof
          Error
            ? error.message
            : "Không thể kết nối đến máy chủ.",
        );

        return [];
      } finally {
        setIsLoading(
          false,
        );
      }
    }, []);

  useEffect(() => {
    let cancelled =
      false;

    async function initialize() {
      const loadedRegions =
        await loadRegions();

      if (cancelled) {
        return;
      }

      setForm(
        createEmptyForm(
          getNextFlightOrder(
            loadedRegions,
          ),
        ),
      );
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadRegions]);

  const filteredRegions =
    useMemo(() => {
      const keyword =
        searchText
          .trim()
          .toLowerCase();

      return regions.filter(
        (region) => {
          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "active" &&
              region.isActive) ||
            (statusFilter ===
              "inactive" &&
              !region.isActive);

          const matchesKeyword =
            !keyword ||
            region.name
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            region.chineseName
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            region.pinyin
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            region.slug
              .toLowerCase()
              .includes(
                keyword,
              );

          return (
            matchesStatus &&
            matchesKeyword
          );
        },
      );
    }, [
      regions,
      searchText,
      statusFilter,
    ]);

  const activeCount =
    regions.filter(
      (region) =>
        region.isActive,
    ).length;

  const inactiveCount =
    regions.length -
    activeCount;

  function updateForm<
    Key extends keyof RegionForm,
  >(
    field: Key,
    value:
      RegionForm[Key],
  ) {
    setForm(
      (previous) => ({
        ...previous,

        [field]:
          value,
      }),
    );

    clearMessages();
  }

  function handleNameChange(
    value: string,
  ) {
    setForm(
      (previous) => {
        const oldAutomaticSlug =
          createSlug(
            previous.name,
          );

        const shouldUpdateSlug =
          !previous.slug ||
          previous.slug ===
            oldAutomaticSlug;

        return {
          ...previous,

          name:
            value,

          slug:
            shouldUpdateSlug
              ? createSlug(
                  value,
                )
              : previous.slug,
        };
      },
    );

    clearMessages();
  }

  function handlePositionClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    const rectangle =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX -
        rectangle.left) /
        rectangle.width) *
      100;

    const y =
      ((event.clientY -
        rectangle.top) /
        rectangle.height) *
      100;

    setForm(
      (previous) => ({
        ...previous,

        mapX:
          Math.min(
            100,
            Math.max(
              0,
              x,
            ),
          ).toFixed(2),

        mapY:
          Math.min(
            100,
            Math.max(
              0,
              y,
            ),
          ).toFixed(2),
      }),
    );

    clearMessages();
  }

  function startEditing(
    region: RegionItem,
  ) {
    setEditingRegionId(
      region.id,
    );

    setForm({
      name:
        region.name,

      chineseName:
        region.chineseName,

      pinyin:
        region.pinyin,

      slug:
        region.slug,

      geography:
        region.geography,

      culture:
        region.culture,

      landmark:
        region.landmark,

      mapX:
        String(
          region.mapX,
        ),

      mapY:
        String(
          region.mapY,
        ),

      flightOrder:
        String(
          region.flightOrder,
        ),

      color:
        region.color,

      isActive:
        region.isActive,
    });

    clearMessages();

    window.scrollTo({
      top: 0,

      behavior:
        "smooth",
    });
  }

  function cancelEditing() {
    setEditingRegionId(
      null,
    );

    setForm(
      createEmptyForm(
        getNextFlightOrder(
          regions,
        ),
      ),
    );

    clearMessages();
  }

  function validateForm() {
    if (
      !form.name.trim()
    ) {
      return "Vui lòng nhập tên tiếng Việt.";
    }

    if (
      !form.chineseName.trim()
    ) {
      return "Vui lòng nhập tên tiếng Trung.";
    }

    if (
      !form.pinyin.trim()
    ) {
      return "Vui lòng nhập Pinyin.";
    }

    if (
      !form.slug.trim()
    ) {
      return "Vui lòng nhập slug.";
    }

    if (
      !form.geography.trim()
    ) {
      return "Vui lòng nhập thông tin địa lý.";
    }

    if (
      !form.culture.trim()
    ) {
      return "Vui lòng nhập thông tin văn hóa.";
    }

    if (
      !form.landmark.trim()
    ) {
      return "Vui lòng nhập địa danh nổi bật.";
    }

    const mapX =
      Number(form.mapX);

    const mapY =
      Number(form.mapY);

    if (
      !Number.isFinite(
        mapX,
      ) ||
      mapX < 0 ||
      mapX > 100
    ) {
      return "Tọa độ X phải từ 0 đến 100.";
    }

    if (
      !Number.isFinite(
        mapY,
      ) ||
      mapY < 0 ||
      mapY > 100
    ) {
      return "Tọa độ Y phải từ 0 đến 100.";
    }

    const flightOrder =
      Number(
        form.flightOrder,
      );

    if (
      !Number.isInteger(
        flightOrder,
      ) ||
      flightOrder < 0
    ) {
      return "Thứ tự bay phải là số nguyên không âm.";
    }

    if (
      !/^#[0-9a-fA-F]{6}$/.test(
        form.color,
      )
    ) {
      return "Màu phải có dạng #34d399.";
    }

    return "";
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    const validationMessage =
      validateForm();

    if (
      validationMessage
    ) {
      setErrorMessage(
        validationMessage,
      );

      setSuccessMessage(
        "",
      );

      return;
    }

    try {
      setIsSaving(true);

      clearMessages();

      const isEditing =
        Boolean(
          editingRegionId,
        );

      const url =
        isEditing
          ? `/api/regions/${editingRegionId}`
          : "/api/regions";

      const method =
        isEditing
          ? "PATCH"
          : "POST";

      const payload = {
        name:
          form.name.trim(),

        chineseName:
          form.chineseName.trim(),

        pinyin:
          form.pinyin.trim(),

        slug:
          createSlug(
            form.slug,
          ),

        geography:
          form.geography.trim(),

        culture:
          form.culture.trim(),

        landmark:
          form.landmark.trim(),

        mapX:
          Number(
            form.mapX,
          ),

        mapY:
          Number(
            form.mapY,
          ),

        flightOrder:
          Number(
            form.flightOrder,
          ),

        color:
          form.color,

        isActive:
          form.isActive,
      };

      const response =
        await fetch(
          url,
          {
            method,

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {
        setIsAuthorized(
          false,
        );

        throw new Error(
          result.message ||
            "Bạn không có quyền quản trị tỉnh.",
        );
      }

      if (
        !response.ok ||
        result.success !==
          true
      ) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Không thể cập nhật tỉnh."
              : "Không thể thêm tỉnh."),
        );
      }

      setSuccessMessage(
        result.message ||
          (isEditing
            ? "Đã cập nhật tỉnh thành công."
            : "Đã thêm tỉnh thành công."),
      );

      setEditingRegionId(
        null,
      );

      const loadedRegions =
        await loadRegions();

      setForm(
        createEmptyForm(
          getNextFlightOrder(
            loadedRegions,
          ),
        ),
      );
    } catch (error) {
      console.error(
        "Lưu tỉnh:",
        error,
      );

      setErrorMessage(
        error instanceof
        Error
          ? error.message
          : "Không thể lưu tỉnh.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Ẩn / kích hoạt tỉnh.
   *
   * QUAN TRỌNG:
   * Không dùng DELETE để ẩn.
   * Luôn PATCH isActive.
   */
  async function toggleRegionStatus(
    region: RegionItem,
  ) {
    if (
      processingRegionId
    ) {
      return;
    }

    const nextStatus =
      !region.isActive;

    if (
      region.isActive
    ) {
      const confirmed =
        window.confirm(
          `Bạn có chắc muốn ẩn tỉnh "${region.name}" khỏi trò chơi không?`,
        );

      if (!confirmed) {
        return;
      }
    }

    try {
      setProcessingRegionId(
        region.id,
      );

      clearMessages();

      const response =
        await fetch(
          `/api/regions/${region.id}`,
          {
            method:
              "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify({
                isActive:
                  nextStatus,
              }),
          },
        );

      const result =
        await readResponse(
          response,
        );

      if (
        response.status ===
          401 ||
        response.status ===
          403
      ) {
        setIsAuthorized(
          false,
        );

        throw new Error(
          result.message ||
            "Bạn không có quyền quản trị tỉnh.",
        );
      }

      if (
        !response.ok ||
        result.success !==
          true
      ) {
        throw new Error(
          result.message ||
            "Không thể cập nhật trạng thái tỉnh.",
        );
      }

      setSuccessMessage(
        result.message ||
          (nextStatus
            ? "Đã kích hoạt tỉnh."
            : "Đã ẩn tỉnh."),
      );

      setRegions(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              region.id
                ? {
                    ...item,

                    isActive:
                      nextStatus,
                  }
                : item,
          ),
      );

      if (
        editingRegionId ===
        region.id
      ) {
        setForm(
          (previous) => ({
            ...previous,

            isActive:
              nextStatus,
          }),
        );
      }
    } catch (error) {
      console.error(
        "Đổi trạng thái tỉnh:",
        error,
      );

      setErrorMessage(
        error instanceof
        Error
          ? error.message
          : "Không thể cập nhật trạng thái tỉnh.",
      );
    } finally {
      setProcessingRegionId(
        null,
      );
    }
  }

  async function refreshRegions() {
    clearMessages();

    const loadedRegions =
      await loadRegions();

    if (
      !editingRegionId
    ) {
      setForm(
        createEmptyForm(
          getNextFlightOrder(
            loadedRegions,
          ),
        ),
      );
    }
  }

  const mapX =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          form.mapX,
        ) || 0,
      ),
    );

  const mapY =
    Math.min(
      100,
      Math.max(
        0,
        Number(
          form.mapY,
        ) || 0,
      ),
    );

  return (
    <main className="min-h-screen bg-[#04131f] px-4 py-6 font-sans text-white sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1700px]">

        {/* HEADER */}

        <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-emerald-300/20 bg-[#082132] p-5 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-black tracking-[0.18em] text-emerald-300">
              HSK SKY QUEST ADMIN
            </p>

            <h1 className="m-0 text-3xl font-black">
              Quản lý tỉnh
            </h1>

            <p className="mb-0 mt-2 text-sm text-slate-400">
              Thêm, sửa, sắp xếp và
              quản lý các điểm đến
              trong trò chơi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <div className="rounded-xl border border-blue-300/20 bg-blue-300/10 px-4 py-2 text-center">
                <strong className="block text-blue-200">
                  {regions.length}
                </strong>

                <small className="text-xs text-slate-400">
                  Tổng
                </small>
              </div>

              <div className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-center">
                <strong className="block text-emerald-200">
                  {activeCount}
                </strong>

                <small className="text-xs text-slate-400">
                  Hoạt động
                </small>
              </div>

              <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-center">
                <strong className="block text-amber-200">
                  {inactiveCount}
                </strong>

                <small className="text-xs text-slate-400">
                  Đã ẩn
                </small>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              <Link
                href="/admin/questions"
                className="flex min-h-11 items-center rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-sm font-bold text-amber-200 no-underline"
              >
                📚 Quản lý câu hỏi
              </Link>

              <Link
                href="/"
                className="flex min-h-11 items-center rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-4 text-sm font-bold text-emerald-200 no-underline"
              >
                ← Về trò chơi
              </Link>
            </nav>
          </div>
        </header>

        {!isAuthorized ? (
          <section className="rounded-3xl border border-red-400/25 bg-red-500/10 p-8 text-center">
            <div className="text-5xl">
              🔒
            </div>

            <h2 className="mb-0 mt-4 text-2xl font-black">
              Không có quyền truy cập
            </h2>

            <p className="mb-0 mt-3 text-red-200">
              {errorMessage}
            </p>
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(400px,0.8fr)_minmax(0,1.45fr)]">

            {/* FORM */}

            <section className="self-start rounded-3xl border border-emerald-300/20 bg-[#082132] p-5 shadow-xl sm:p-7 xl:sticky xl:top-5">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-black tracking-[0.16em] text-emerald-300">
                    {editingRegionId
                      ? "CHỈNH SỬA"
                      : "TỈNH MỚI"}
                  </span>

                  <h2 className="mb-0 mt-2 text-2xl font-black">
                    {editingRegionId
                      ? "Cập nhật tỉnh"
                      : "Thêm tỉnh mới"}
                  </h2>
                </div>

                {editingRegionId && (
                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-300"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-5"
              >

                {/* NAME */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Tên tiếng Việt *
                    </span>

                    <input
                      value={
                        form.name
                      }
                      onChange={(
                        event,
                      ) =>
                        handleNameChange(
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Bắc Kinh"
                      required
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Tên tiếng Trung *
                    </span>

                    <input
                      value={
                        form.chineseName
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "chineseName",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="北京"
                      required
                      className={
                        inputClassName
                      }
                    />
                  </label>
                </div>

                {/* PINYIN + SLUG */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Pinyin *
                    </span>

                    <input
                      value={
                        form.pinyin
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "pinyin",
                          event
                            .target
                            .value,
                        )
                      }
                      placeholder="Běijīng"
                      required
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Slug *
                    </span>

                    <input
                      value={
                        form.slug
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "slug",
                          createSlug(
                            event
                              .target
                              .value,
                          ),
                        )
                      }
                      placeholder="bac-kinh"
                      required
                      className={
                        inputClassName
                      }
                    />
                  </label>
                </div>

                {/* GEOGRAPHY */}

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    Địa lý *
                  </span>

                  <textarea
                    value={
                      form.geography
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "geography",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    required
                    placeholder="Thông tin địa lý của tỉnh..."
                    className={
                      textAreaClassName
                    }
                  />
                </label>

                {/* CULTURE */}

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    Văn hóa *
                  </span>

                  <textarea
                    value={
                      form.culture
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "culture",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    required
                    placeholder="Thông tin văn hóa..."
                    className={
                      textAreaClassName
                    }
                  />
                </label>

                {/* LANDMARK */}

                <label className="block">
                  <span className="mb-2 block text-sm font-bold">
                    Địa danh nổi bật *
                  </span>

                  <textarea
                    value={
                      form.landmark
                    }
                    onChange={(
                      event,
                    ) =>
                      updateForm(
                        "landmark",
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    required
                    placeholder="Ví dụ: Vạn Lý Trường Thành..."
                    className={
                      textAreaClassName
                    }
                  />
                </label>

                {/* MAP COORD */}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Tọa độ X
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        form.mapX
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "mapX",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Tọa độ Y
                    </span>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        form.mapY
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "mapY",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        inputClassName
                      }
                    />
                  </label>
                </div>

                {/* MAP */}

                <div>
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <strong>
                      Chọn vị trí
                    </strong>

                    <span className="text-slate-500">
                      Bấm vào khung
                    </span>
                  </div>

                  <div
                    onClick={
                      handlePositionClick
                    }
                    className="relative h-64 cursor-crosshair overflow-hidden rounded-2xl border border-emerald-300/20 bg-[#061a29]"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:10%_10%]" />

                    {regions.map(
                      (region) => (
                        <span
                          key={
                            region.id
                          }
                          title={
                            region.name
                          }
                          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80"
                          style={{
                            left: `${region.mapX}%`,

                            top: `${region.mapY}%`,

                            backgroundColor:
                              region.color,
                          }}
                        />
                      ),
                    )}

                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${mapX}%`,

                        top: `${mapY}%`,
                      }}
                    >
                      <span
                        className="block size-6 animate-pulse rounded-full border-4 border-white"
                        style={{
                          backgroundColor:
                            form.color,
                        }}
                      />

                      <strong className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black/75 px-2 py-1 text-xs">
                        {form.name ||
                          "Tỉnh mới"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* ORDER + COLOR + STATUS */}

                <div className="grid gap-4 sm:grid-cols-3">
                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Thứ tự bay
                    </span>

                    <input
                      type="number"
                      min="0"
                      value={
                        form.flightOrder
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "flightOrder",
                          event
                            .target
                            .value,
                        )
                      }
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Màu
                    </span>

                    <input
                      type="color"
                      value={
                        form.color
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "color",
                          event
                            .target
                            .value,
                        )
                      }
                      className="h-12 w-full cursor-pointer rounded-xl bg-[#0d2c40] p-1"
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-bold">
                      Trạng thái
                    </span>

                    <select
                      value={
                        form.isActive
                          ? "active"
                          : "inactive"
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "isActive",
                          event
                            .target
                            .value ===
                            "active",
                        )
                      }
                      className={
                        inputClassName
                      }
                    >
                      <option value="active">
                        Hoạt động
                      </option>

                      <option value="inactive">
                        Tạm ẩn
                      </option>
                    </select>
                  </label>
                </div>

                {/* MESSAGES */}

                {errorMessage && (
                  <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">
                    ✕ {errorMessage}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                    ✓{" "}
                    {successMessage}
                  </div>
                )}

                {/* SAVE */}

                <button
                  type="submit"
                  disabled={
                    isSaving
                  }
                  className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-300 px-6 font-black text-[#052d31] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? "Đang lưu..."
                    : editingRegionId
                      ? "✓ Lưu thay đổi"
                      : "＋ Thêm tỉnh mới"}
                </button>
              </form>
            </section>

            {/* LIST */}

            <section className="min-w-0 rounded-3xl border border-emerald-300/20 bg-[#082132] p-5 shadow-xl sm:p-7">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-xs font-black tracking-[0.16em] text-emerald-300">
                    DỮ LIỆU MONGODB
                  </span>

                  <h2 className="mb-0 mt-2 text-2xl font-black">
                    Danh sách tỉnh
                  </h2>
                </div>

                <p className="m-0 text-sm text-slate-400">
                  Hiển thị{" "}
                  <strong className="text-white">
                    {
                      filteredRegions.length
                    }
                  </strong>{" "}
                  /{" "}
                  <strong className="text-white">
                    {
                      regions.length
                    }
                  </strong>{" "}
                  tỉnh
                </p>
              </div>

              {/* FILTER */}

              <div className="mb-6 grid gap-3 md:grid-cols-[1fr_190px_auto]">
                <input
                  type="search"
                  value={
                    searchText
                  }
                  onChange={(
                    event,
                  ) =>
                    setSearchText(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Tìm tên tỉnh, pinyin, slug..."
                  className={
                    inputClassName
                  }
                />

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setStatusFilter(
                      event
                        .target
                        .value as StatusFilter,
                    )
                  }
                  className={
                    inputClassName
                  }
                >
                  <option value="all">
                    Tất cả trạng thái
                  </option>

                  <option value="active">
                    Đang hoạt động
                  </option>

                  <option value="inactive">
                    Đã ẩn
                  </option>
                </select>

                <button
                  type="button"
                  onClick={() =>
                    void refreshRegions()
                  }
                  disabled={
                    isLoading
                  }
                  className="min-h-12 rounded-xl border border-white/10 bg-white/5 px-5 font-bold transition hover:bg-white/10 disabled:opacity-50"
                >
                  {isLoading
                    ? "Đang tải..."
                    : "↻ Làm mới"}
                </button>
              </div>

              {/* LOADING */}

              {isLoading ? (
                <div className="grid min-h-72 place-items-center text-slate-400">
                  <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-300/20 border-t-emerald-300" />

                    <p className="mt-4">
                      Đang tải tỉnh...
                    </p>
                  </div>
                </div>
              ) : filteredRegions.length ===
                0 ? (
                <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-white/10 text-center text-slate-400">
                  <div>
                    <div className="text-5xl">
                      🗺️
                    </div>

                    <h3 className="mt-4 text-lg font-black text-white">
                      Không có tỉnh phù hợp
                    </h3>

                    <p className="mt-2 text-sm">
                      Hãy thêm tỉnh mới hoặc
                      thay đổi bộ lọc.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {filteredRegions.map(
                    (region) => (
                      <article
                        key={
                          region.id
                        }
                        className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b2a3d]"
                      >
                        <div
                          className="h-2"
                          style={{
                            backgroundColor:
                              region.color,
                          }}
                        />

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="m-0 truncate text-xl font-black">
                                {
                                  region.name
                                }
                              </h3>

                              <p className="mb-0 mt-1 text-sm text-amber-200">
                                {
                                  region.chineseName
                                }{" "}
                                ·{" "}
                                {
                                  region.pinyin
                                }
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                /
                                {
                                  region.slug
                                }
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-black ${
                                region.isActive
                                  ? "bg-emerald-300/10 text-emerald-300"
                                  : "bg-red-300/10 text-red-300"
                              }`}
                            >
                              {region.isActive
                                ? "HOẠT ĐỘNG"
                                : "ĐÃ ẨN"}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="rounded-xl bg-white/5 p-3 text-center">
                              <small className="block text-slate-500">
                                Thứ tự
                              </small>

                              <strong>
                                {
                                  region.flightOrder
                                }
                              </strong>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 text-center">
                              <small className="block text-slate-500">
                                X
                              </small>

                              <strong>
                                {
                                  region.mapX
                                }
                              </strong>
                            </div>

                            <div className="rounded-xl bg-white/5 p-3 text-center">
                              <small className="block text-slate-500">
                                Y
                              </small>

                              <strong>
                                {
                                  region.mapY
                                }
                              </strong>
                            </div>
                          </div>

                          <p className="mb-0 mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
                            {
                              region.geography
                            }
                          </p>

                          <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={
                                processingRegionId !==
                                null
                              }
                              onClick={() =>
                                startEditing(
                                  region,
                                )
                              }
                              className="min-h-11 rounded-xl border border-blue-300/20 bg-blue-300/10 text-sm font-bold text-blue-200 disabled:opacity-50"
                            >
                              ✏️ Sửa
                            </button>

                            <button
                              type="button"
                              disabled={
                                processingRegionId ===
                                region.id
                              }
                              onClick={() =>
                                void toggleRegionStatus(
                                  region,
                                )
                              }
                              className={`min-h-11 rounded-xl border text-sm font-bold disabled:opacity-50 ${
                                region.isActive
                                  ? "border-amber-300/20 bg-amber-300/10 text-amber-200"
                                  : "border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                              }`}
                            >
                              {processingRegionId ===
                              region.id
                                ? "Đang xử lý..."
                                : region.isActive
                                  ? "👁 Ẩn tỉnh"
                                  : "✓ Kích hoạt"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}