"use client";

import {
  useMemo,
} from "react";

interface MapRegion {
  id: string;

  name: string;

  chineseName: string;

  pinyin: string;

  mapX?: number;

  mapY?: number;

  color?: string;

  flightOrder?: number;

  isActive?: boolean;
}

interface ChinaFlightMapProps {
  progress: number;

  currentRegion: MapRegion;

  regions?: MapRegion[];

  onJump: () => void;
}

function clamp(
  value: number,
) {
  return Math.min(
    92,
    Math.max(
      8,
      value,
    ),
  );
}

function getRegionX(
  region: MapRegion,
  index: number,
  total: number,
) {
  if (
    typeof region.mapX ===
      "number" &&
    Number.isFinite(
      region.mapX,
    )
  ) {
    return clamp(
      region.mapX,
    );
  }

  if (total <= 1) {
    return 50;
  }

  return (
    15 +
    (index /
      (total - 1)) *
      70
  );
}

function getRegionY(
  region: MapRegion,
  index: number,
) {
  if (
    typeof region.mapY ===
      "number" &&
    Number.isFinite(
      region.mapY,
    )
  ) {
    return clamp(
      region.mapY,
    );
  }

  const fallback = [
    30,
    55,
    38,
    67,
    45,
    72,
    25,
    60,
  ];

  return fallback[
    index %
      fallback.length
  ];
}

export default function ChinaFlightMap({
  progress,
  currentRegion,
  regions = [],
  onJump,
}: ChinaFlightMapProps) {
  /**
   * Chỉ lấy tỉnh active.
   *
   * Sau đó sắp xếp đúng thứ tự bay.
   */
  const displayedRegions =
    useMemo(() => {
      const source =
        regions.length > 0
          ? regions
          : [
              currentRegion,
            ];

      const filtered =
        source.filter(
          (region) =>
            region &&
            region.id &&
            region.isActive !==
              false,
        );

      return [
        ...filtered,
      ].sort(
        (a, b) =>
          (a.flightOrder ??
            0) -
          (b.flightOrder ??
            0),
      );
    }, [
      regions,
      currentRegion,
    ]);

  const normalizedProgress =
    ((progress % 100) +
      100) %
    100;

  const flightData =
    useMemo(() => {
      const total =
        displayedRegions.length;

      const points =
        displayedRegions.map(
          (
            region,
            index,
          ) => ({
            region,

            x: getRegionX(
              region,
              index,
              total,
            ),

            y: getRegionY(
              region,
              index,
            ),
          }),
        );

      if (
        points.length === 0
      ) {
        return {
          points: [],

          planeX: 50,

          planeY: 50,

          rotation: 0,

          path: "",
        };
      }

      if (
        points.length === 1
      ) {
        return {
          points,

          planeX:
            points[0].x,

          planeY:
            points[0].y,

          rotation: 0,

          path: "",
        };
      }

      /**
       * Máy bay đi lần lượt
       * qua các tỉnh theo flightOrder.
       */
      const exactPosition =
        (normalizedProgress /
          100) *
        points.length;

      const fromIndex =
        Math.floor(
          exactPosition,
        ) %
        points.length;

      const toIndex =
        (fromIndex + 1) %
        points.length;

      const localProgress =
        exactPosition -
        Math.floor(
          exactPosition,
        );

      const from =
        points[fromIndex];

      const to =
        points[toIndex];

      const planeX =
        from.x +
        (to.x - from.x) *
          localProgress;

      const planeY =
        from.y +
        (to.y - from.y) *
          localProgress;

      const rotation =
        (Math.atan2(
          to.y -
            from.y,

          to.x -
            from.x,
        ) *
          180) /
        Math.PI;

      /**
       * Đường bay nối toàn bộ tỉnh.
       */
      const path = [
        ...points,
        points[0],
      ]
        .map(
          (point) =>
            `${point.x},${point.y}`,
        )
        .join(" ");

      return {
        points,

        planeX,

        planeY,

        rotation,

        path,
      };
    }, [
      displayedRegions,
      normalizedProgress,
    ]);

  return (
    <section className="relative w-full overflow-hidden rounded-[22px] border border-cyan-300/20 bg-[#071c2d] shadow-[0_24px_70px_rgba(0,8,20,0.45)] sm:rounded-[28px]">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_80%_75%,rgba(52,211,153,0.1),transparent_32%),linear-gradient(145deg,#0d3048_0%,#071c2d_52%,#04131f_100%)]" />

      {/* HEADER */}

      <header className="relative z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] bg-[#061a29]/90 p-4 backdrop-blur-md sm:p-6">
        <div className="min-w-0">

          <div className="mb-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black tracking-widest text-cyan-200 sm:px-3 sm:text-xs">
              HÀNH TRÌNH KHÁM PHÁ
            </span>

            <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black text-emerald-200 sm:px-3 sm:text-xs">
              {
                displayedRegions.length
              }{" "}
              ĐIỂM
            </span>
          </div>

          <h2 className="truncate text-base font-black text-white sm:text-2xl lg:text-3xl">
            Bản đồ Trung Quốc
          </h2>

          <p className="mt-1 truncate text-xs text-slate-400 sm:text-sm">
            Đang qua{" "}

            <strong className="text-amber-200">
              {
                currentRegion.name
              }
            </strong>
          </p>
        </div>

        <div className="flex min-w-[66px] shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 sm:min-w-[100px] sm:flex-row sm:gap-3 sm:px-4 sm:py-3">
          <span className="text-lg sm:text-xl">
            ✈️
          </span>

          <div className="text-center sm:text-left">
            <span className="hidden text-[9px] font-black tracking-widest text-slate-500 sm:block">
              TIẾN ĐỘ
            </span>

            <strong className="text-sm text-amber-200 sm:text-lg">
              {Math.round(
                normalizedProgress,
              )}
              %
            </strong>
          </div>
        </div>
      </header>

      {/* MAP */}

      <div className="relative z-10 h-[350px] w-full sm:h-[500px] lg:h-[600px]">

        {/* GRID */}

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",

            backgroundSize:
              "36px 36px",
          }}
        />

        {/* CHINA SHAPE */}

        <div className="pointer-events-none absolute inset-[8%_3%_8%] sm:inset-[8%_7%_10%]">
          <div
            className="absolute inset-0 border border-cyan-200/10 bg-gradient-to-br from-cyan-300/[0.1] via-emerald-300/[0.05] to-blue-400/[0.07]"
            style={{
              clipPath:
                "polygon(10% 30%, 18% 12%, 38% 8%, 50% 16%, 67% 10%, 82% 22%, 94% 39%, 88% 54%, 96% 68%, 79% 78%, 72% 92%, 52% 86%, 37% 95%, 24% 79%, 8% 72%, 13% 56%, 3% 44%)",
            }}
          />
        </div>

        {/* FLIGHT PATH */}

        {flightData.path && (
          <svg
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={
                flightData.path
              }
              fill="none"
              stroke="rgba(103,232,249,0.65)"
              strokeWidth="0.4"
              strokeDasharray="1.5 1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}

        {/* REGIONS */}

        {flightData.points.map(
          ({
            region,
            x,
            y,
          }) => {
            const isCurrent =
              region.id ===
              currentRegion.id;

            const color =
              region.color ||
              "#34d399";

            return (
              <div
                key={
                  region.id
                }
                className="group absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${x}%`,

                  top: `${y}%`,
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-20"
                    style={{
                      backgroundColor:
                        color,
                    }}
                  />
                )}

                {/* POINT */}

                <span
                  className={`relative block rounded-full border-2 border-white shadow-xl ${
                    isCurrent
                      ? "size-7 sm:size-8"
                      : "size-5 sm:size-6"
                  }`}
                  style={{
                    backgroundColor:
                      color,

                    boxShadow: `0 0 18px ${color}88`,
                  }}
                />

                {/* LABEL
                    Luôn hiển thị để nhìn thấy tất cả tỉnh.
                */}

                <div
                  className={`absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-center shadow-xl backdrop-blur-md ${
                    isCurrent
                      ? "border-amber-300/40 bg-[#061827] ring-1 ring-amber-300/20"
                      : "border-white/10 bg-[#061827]/95"
                  }`}
                >
                  <strong
                    className={`block text-[10px] sm:text-xs ${
                      isCurrent
                        ? "text-amber-200"
                        : "text-white"
                    }`}
                  >
                    {
                      region.name
                    }
                  </strong>

                  <span
                    lang="zh-CN"
                    className="block text-[9px] text-amber-200/80 sm:text-[10px]"
                  >
                    {region.chineseName ||
                      region.pinyin ||
                      ""}
                  </span>
                </div>
              </div>
            );
          },
        )}

        {/* PLANE */}

        {flightData.points.length >
          0 && (
          <div
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-300 ease-linear"
            style={{
              left: `${flightData.planeX}%`,

              top: `${flightData.planeY}%`,
            }}
          >
            <span
              className="block text-3xl drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] sm:text-4xl lg:text-5xl"
              style={{
                transform: `rotate(${flightData.rotation}deg)`,
              }}
            >
              ✈️
            </span>
          </div>
        )}

        {/* INFO */}

        <div className="absolute bottom-5 left-5 z-30 hidden max-w-xs rounded-2xl border border-white/10 bg-[#061a29]/90 p-4 backdrop-blur-lg sm:block">
          <strong className="text-sm text-white">
            🧭 Chọn đúng thời điểm
          </strong>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Khi máy bay đi qua tỉnh
            muốn khám phá, hãy bấm
            nhảy xuống.
          </p>
        </div>
      </div>

      {/* FOOTER */}

      <footer className="relative z-20 border-t border-white/[0.07] bg-[#061a29]/95 p-4 backdrop-blur-md sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-widest text-emerald-300 sm:text-xs">
              VỊ TRÍ HIỆN TẠI
            </span>

            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <strong className="truncate text-lg font-black text-white sm:text-2xl">
                {
                  currentRegion.name
                }
              </strong>

              <span
                lang="zh-CN"
                className="shrink-0 text-base font-bold text-amber-200 sm:text-lg"
              >
                {
                  currentRegion.chineseName
                }
              </span>
            </div>

            <p className="mt-1 truncate text-xs italic text-slate-400 sm:text-sm">
              {
                currentRegion.pinyin
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onJump
            }
            className="min-h-12 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 text-sm font-black text-[#302009] shadow-[0_10px_30px_rgba(251,191,36,0.18)] transition hover:-translate-y-0.5 sm:w-auto sm:min-w-[230px]"
          >
            🪂 NHẢY XUỐNG
          </button>
        </div>
      </footer>
    </section>
  );
}