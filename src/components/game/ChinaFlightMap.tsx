"use client";

import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface MapPoint {
  region: MapRegion;
  x: number;
  y: number;
  label: string;
  chinese: string;
  pinyin: string;
}

const CHINA_OUTLINE =
  "M828 233L853 221L864 207L887 214L885 203L912 195L916 185L928 195L924 190L936 186L939 179L933 153L948 145L968 148L985 110L995 104L993 94L1000 91L968 96L959 104L933 104L928 83L877 67L854 16L808 2L769 7L755 16L767 20L768 27L741 57L744 61L719 72L702 67L682 96L689 104L732 99L750 113L753 122L713 123L699 128L693 139L666 144L651 155L623 150L616 162L624 173L585 194L551 195L512 210L444 191L372 190L356 163L325 151L282 147L285 121L274 105L235 89L232 78L221 79L212 89L196 95L196 115L186 118L155 112L142 140L147 147L135 144L104 152L112 157L119 182L112 185L115 187L110 188L108 202L69 220L55 219L46 231L36 232L34 226L22 228L0 248L5 261L22 264L27 283L16 288L38 295L43 310L75 315L78 330L90 335L84 347L94 365L89 370L85 364L79 367L91 393L100 393L124 410L129 403L140 404L164 425L172 423L178 432L189 433L189 439L198 439L203 447L206 442L223 448L248 444L251 459L264 441L292 445L302 465L326 463L361 440L383 450L393 436L403 453L409 453L410 469L409 482L390 502L390 516L412 512L412 528L423 533L418 547L430 548L434 558L448 553L450 562L459 564L457 541L467 542L471 536L479 541L484 535L495 540L517 525L526 533L541 535L539 550L550 556L591 559L587 568L591 580L601 576L596 565L643 547L646 551L652 536L666 541L669 535L672 540L698 533L721 514L724 504L738 499L737 493L741 497L742 489L753 489L746 486L754 474L748 469L757 469L766 451L774 448L772 443L781 441L781 425L787 426L785 416L790 412L772 401L782 396L790 400L777 384L787 385L785 377L770 365L760 336L742 324L760 307L758 303L766 304L769 296L796 291L799 282L767 275L744 287L738 270L723 268L717 258L723 251L730 256L737 252L773 222L784 222L792 229L828 233Z";

const PROVINCE_LINES = [
  "M372 190L395 209L392 212L403 227L432 222L433 232L421 239L444 248L446 256L459 260L461 253L497 247L498 255L485 271L498 282",
  "M282 147L307 254L339 259L342 266L370 269L382 262L381 251L399 258L411 253L432 268L463 277L473 287L478 309",
  "M384 189L395 209L367 192L366 204L341 211L329 226L315 227L306 250",
  "M432 268L431 263L463 277L486 274L514 289L518 310L533 320L535 312",
  "M486 274L461 326L467 335L462 339L446 335L443 338L449 347L461 348",
  "M478 309L476 314L461 326L467 335L477 336L482 345L498 348L500 361",
  "M548 287L555 275L535 266L543 256L540 248L527 256L524 275L500 282",
  "M599 331L602 313L599 289L605 280L601 269L607 263L611 248",
  "M599 331L583 356L595 363L584 371L586 381L596 390L582 402",
  "M567 402L566 413L579 425L589 415L602 415L601 409L606 408L630 419",
  "M610 355L618 366L630 370L653 369L655 379L671 385L679 386",
  "M653 300L651 313L643 318L626 319L618 327L599 331",
  "M651 313L680 305L678 298L690 283L719 270L722 265",
  "M679 296L679 310L692 305L671 323L683 331L695 330L703 324",
  "M696 330L703 324L709 334L722 329L729 334L760 307",
  "M700 343L692 346L684 340L678 356L672 356L677 366L688 366L689 379",
  "M688 391L692 414L701 409L702 418L710 412L728 420",
  "M702 418L701 409L657 426L662 440L651 453L659 470L657 477",
  "M651 453L662 440L660 431L653 426L651 413L643 420L642 414L630 419",
  "M657 477L661 477L658 492L670 492L660 502L664 506L680 501L687 505",
  "M661 477L657 477L659 470L651 453L639 491L657 489",
  "M687 505L699 465L709 457L706 452L730 439L726 422",
  "M699 465L688 498L703 503L711 522L724 504L732 505",
  "M615 534L625 502L616 503L613 494L608 497L617 482L612 481L613 475L585 480",
  "M615 534L588 556L591 580L601 576L596 568L599 563L640 552",
  "M528 503L547 487L557 495L582 484L585 461L573 461L584 453",
  "M516 450L512 443L503 447L502 434L493 434L493 440L477 457L479 474L460 479",
  "M493 440L493 434L502 434L504 448L512 443L516 450L533 448",
  "M449 459L457 476L464 479L479 473L477 457L493 440",
  "M409 441L404 443L403 438L400 443L403 453L409 453L409 482L393 496L390 516",
  "M263 305L243 298L226 299L173 318L146 311L133 320L113 316",
  "M263 305L258 306L265 309L259 320L266 327L262 340L279 356L325 368",
  "M292 445L301 456L302 465L330 462L337 452L363 440L383 450",
  "M325 368L343 364L353 369L357 380L369 383L369 377L378 381L377 376L387 374",
  "M155 112L186 118L196 115L196 95L212 89L217 79L232 78L235 89L274 105",
  "M650 262L667 245L656 237L666 231L660 224L650 231L630 233L624 244L611 248",
  "M719 192L727 202L729 215L742 215L747 196L756 208L786 191",
  "M743 274L737 269L721 267L713 274L703 275L679 296",
  "M760 336L743 327L743 322L729 334L722 329",
];

const CITY_FALLBACKS = [
  {
    name: "Bắc Kinh",
    chinese: "北京",
    pinyin: "Běijīng",
    x: 700,
    y: 235,
  },
  {
    name: "Tây An",
    chinese: "西安",
    pinyin: "Xī'ān",
    x: 574,
    y: 335,
  },
  {
    name: "Thành Đô",
    chinese: "成都",
    pinyin: "Chéngdū",
    x: 495,
    y: 400,
  },
  {
    name: "Quế Lâm",
    chinese: "桂林",
    pinyin: "Guìlín",
    x: 598,
    y: 492,
  },
];

const INVALID_REGION_NAMES = [
  "cà mau",
  "vũng tàu",
  "việt nam",
];

function hasInvalidRegionName(
  region: MapRegion,
) {
  const text = `${region.name} ${region.chineseName} ${region.pinyin}`
    .toLocaleLowerCase("vi")
    .trim();

  return INVALID_REGION_NAMES.some(
    (name) =>
      text.includes(name),
  );
}

function buildPoints(
  regions: MapRegion[],
  useFallbacks: boolean,
): MapPoint[] {
  return regions.map(
    (
      region,
      index,
    ) => {
      const fallback =
        CITY_FALLBACKS[
          index %
            CITY_FALLBACKS.length
        ];

      const validCoordinates =
        typeof region.mapX ===
          "number" &&
        Number.isFinite(
          region.mapX,
        ) &&
        typeof region.mapY ===
          "number" &&
        Number.isFinite(
          region.mapY,
        );

      return {
        region,

        x: useFallbacks
          ? fallback.x
          : validCoordinates
            ? Math.min(
                980,
                Math.max(
                  20,
                  region.mapX! *
                    10,
                ),
              )
            : fallback.x,

        y: useFallbacks
          ? fallback.y
          : validCoordinates
            ? Math.min(
                590,
                Math.max(
                  25,
                  region.mapY! *
                    6.2,
                ),
              )
            : fallback.y,

        label: useFallbacks
          ? fallback.name
          : region.name,

        chinese: useFallbacks
          ? fallback.chinese
          : region.chineseName ||
            "",

        pinyin: useFallbacks
          ? fallback.pinyin
          : region.pinyin ||
            "",
      };
    },
  );
}

function PlaneIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-11 w-11 sm:h-14 sm:w-14"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="planeFill"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor="#fff7c2"
          />
          <stop
            offset="50%"
            stopColor="#ffd166"
          />
          <stop
            offset="100%"
            stopColor="#fb923c"
          />
        </linearGradient>

        <filter
          id="planeGlow"
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur
            stdDeviation="4"
            result="blur"
          />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M31 3c3-2 6 0 6 4v18l18 13v7L37 38v14l8 6v5l-12-4-12 4v-5l8-6V38L11 45v-7l17-13V7c0-2 1-3 3-4Z"
        fill="url(#planeFill)"
        stroke="#fff7d6"
        strokeWidth="1.5"
        filter="url(#planeGlow)"
      />
    </svg>
  );
}

export default function ChinaFlightMap({
  progress,
  currentRegion,
  regions = [],
  onJump,
}: ChinaFlightMapProps) {
  const { language } =
    useLanguage();

  const localize = (
    vietnamese: string,
    chinese: string,
  ) =>
    language === "zh"
      ? chinese
      : vietnamese;

  const normalizedProgress =
    ((progress % 100) + 100) %
    100;

  const displayedRegions =
    useMemo(() => {
      const source =
        regions.length > 0
          ? regions
          : [currentRegion];

      return [...source]
        .filter(
          (region) =>
            region?.id &&
            region.isActive !==
              false,
        )
        .sort(
          (a, b) =>
            (a.flightOrder ?? 0) -
            (b.flightOrder ?? 0),
        );
    }, [
      regions,
      currentRegion,
    ]);

  const usesFallbacks =
    displayedRegions.some(
      hasInvalidRegionName,
    );

  const points =
    useMemo(() => {
      const source =
        displayedRegions.length > 0
          ? displayedRegions
          : CITY_FALLBACKS.map(
              (
                city,
                index,
              ) => ({
                id: `fallback-${index}`,
                name: city.name,
                chineseName:
                  city.chinese,
                pinyin:
                  city.pinyin,
                flightOrder:
                  index,
              }),
            );

      return buildPoints(
        source,
        usesFallbacks,
      );
    }, [
      displayedRegions,
      usesFallbacks,
    ]);

  const flight =
    useMemo(() => {
      if (
        points.length < 2
      ) {
        return {
          x:
            points[0]?.x ??
            700,
          y:
            points[0]?.y ??
            235,
          rotation: 0,
          route: "",
        };
      }

      const position =
        (normalizedProgress /
          100) *
        points.length;

      const fromIndex =
        Math.floor(position) %
        points.length;

      const toIndex =
        (fromIndex + 1) %
        points.length;

      const fraction =
        position -
        Math.floor(position);

      const from =
        points[fromIndex];

      const to =
        points[toIndex];

      return {
        x:
          from.x +
          (to.x - from.x) *
            fraction,

        y:
          from.y +
          (to.y - from.y) *
            fraction,

        rotation:
          (Math.atan2(
            to.y - from.y,
            to.x - from.x,
          ) *
            180) /
            Math.PI +
          90,

        route: [
          ...points,
          points[0],
        ]
          .map(
            (point) =>
              `${point.x},${point.y}`,
          )
          .join(" "),
      };
    }, [
      points,
      normalizedProgress,
    ]);

  const currentPoint =
    points.find(
      (point) =>
        point.region.id ===
        currentRegion.id,
    ) ?? points[0];

  const currentName =
    usesFallbacks
      ? currentPoint?.label ??
        "Bắc Kinh"
      : currentRegion.name;

  const currentChinese =
    usesFallbacks
      ? currentPoint?.chinese ??
        "北京"
      : currentRegion.chineseName;

  const currentPinyin =
    usesFallbacks
      ? currentPoint?.pinyin ??
        "Běijīng"
      : currentRegion.pinyin;

  return (
    <section
      lang={language === "zh" ? "zh-CN" : "vi"}
      className="relative left-1/2 w-[94vw] max-w-[1500px] -translate-x-1/2 overflow-hidden rounded-[18px] border border-cyan-300/20 bg-[#061827] shadow-[0_20px_55px_rgba(0,8,20,0.45)] sm:rounded-[24px]"
    >
      <style>{`
        @keyframes routeFlow {
          to { stroke-dashoffset: -32; }
        }

        @keyframes planeFloat {
          0%, 100% { translate: 0 0; }
          50% { translate: 0 -5px; }
        }

        @keyframes planePulse {
          0%, 100% { opacity: .3; scale: .85; }
          50% { opacity: .75; scale: 1.2; }
        }

        .china-flight-route {
          animation: routeFlow 1.2s linear infinite;
        }

        .china-flight-plane {
          animation: planeFloat 1.4s ease-in-out infinite;
        }

        .china-flight-glow {
          animation: planePulse 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .china-flight-route,
          .china-flight-plane,
          .china-flight-glow {
            animation: none;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_78%_78%,rgba(16,185,129,0.08),transparent_30%),linear-gradient(145deg,#0b2b40_0%,#061827_65%,#04111d_100%)]" />

      <header className="relative z-20 flex items-center justify-between gap-3 border-b border-white/[0.08] bg-[#061827]/90 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4 lg:px-7">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black tracking-wider text-cyan-200 sm:text-[10px]">
              {localize(
                "HÀNH TRÌNH KHÁM PHÁ",
                "探索之旅",
              )}
            </span>

            <span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[9px] font-black text-emerald-200 sm:text-[10px]">
              {points.length}{" "}
              {localize(
                "ĐIỂM",
                "个地点",
              )}
            </span>
          </div>

          <h2 className="truncate text-lg font-black text-white sm:text-2xl lg:text-3xl">
            {localize(
              "Bản đồ Trung Quốc",
              "中国地图",
            )}
          </h2>

          <p className="mt-0.5 truncate text-[11px] text-slate-400 sm:text-xs">
            {localize(
              "Đang qua",
              "正在经过",
            )}{" "}
            <strong className="text-amber-200">
              {language === "zh"
                ? currentChinese
                : currentName}
            </strong>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 sm:gap-3 sm:px-4">
          <span className="text-lg sm:text-xl">
            ✈️
          </span>

          <div>
            <span className="hidden text-[9px] font-bold tracking-widest text-slate-500 sm:block">
              {localize(
                "TIẾN ĐỘ",
                "进度",
              )}
            </span>

            <strong className="text-sm text-amber-200 sm:text-base">
              {Math.round(
                normalizedProgress,
              )}
              %
            </strong>
          </div>
        </div>
      </header>

      <div className="relative z-10 grid h-[min(56vh,520px)] min-h-[320px] place-items-center overflow-hidden sm:h-[min(60vh,580px)] sm:min-h-[380px] lg:h-[min(62vh,620px)] lg:min-h-[420px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.35) 1px,transparent 1px)",
            backgroundSize:
              "32px 32px",
          }}
        />

        {/* Giữ đúng tỷ lệ 1000 × 620 để bản đồ không bị kéo giãn. */}
        <div className="relative aspect-[1000/620] w-[min(100%,94vh)] max-w-full">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 1000 620"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={localize(
              "Bản đồ Trung Quốc với đường biên tỉnh",
              "显示省界的中国地图",
            )}
          >
            <defs>
              <linearGradient
                id="chinaFill"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="#25b4c5"
                />
                <stop
                  offset="52%"
                  stopColor="#0b879b"
                />
                <stop
                  offset="100%"
                  stopColor="#07566c"
                />
              </linearGradient>

              <filter
                id="chinaGlow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur
                  stdDeviation="4"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d={CHINA_OUTLINE}
              fill="url(#chinaFill)"
              stroke="#67e8f9"
              strokeWidth="3"
              strokeLinejoin="round"
              filter="url(#chinaGlow)"
              vectorEffect="non-scaling-stroke"
            />

            <g
              fill="none"
              stroke="#a5f3fc"
              strokeOpacity=".78"
              strokeWidth="1.4"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            >
              {PROVINCE_LINES.map(
                (
                  line,
                  index,
                ) => (
                  <path
                    key={index}
                    d={line}
                  />
                ),
              )}
            </g>

            <path
              d="M594 583L581 585L571 595L571 611L586 616L601 607L609 588L604 581Z"
              fill="url(#chinaFill)"
              stroke="#67e8f9"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            <path
              d="M762 541L769 551L788 497L781 492L772 496L757 520L760 540Z"
              fill="url(#chinaFill)"
              stroke="#67e8f9"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {flight.route && (
              <polyline
                points={flight.route}
                fill="none"
                stroke="#67e8f9"
                strokeOpacity=".85"
                strokeWidth="2.5"
                strokeDasharray="10 10"
                strokeLinecap="round"
                className="china-flight-route"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>

          {points.map(
            (point) => {
              const isCurrent =
                point.region.id ===
                currentRegion.id;

              const color =
                point.region.color ||
                "#34d399";

              return (
                <div
                  key={point.region.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${
                      (point.x / 1000) *
                      100
                    }%`,
                    top: `${
                      (point.y / 620) *
                      100
                    }%`,
                  }}
                >
                  {isCurrent && (
                    <span
                      className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-25 sm:size-14"
                      style={{
                        backgroundColor:
                          color,
                      }}
                    />
                  )}

                  <span
                    className={`relative block rounded-full border-2 border-white ${
                      isCurrent
                        ? "size-6 sm:size-7"
                        : "size-4 sm:size-5"
                    }`}
                    style={{
                      backgroundColor:
                        color,
                      boxShadow:
                        `0 0 16px ${color}99`,
                    }}
                  />

                  <div
                    className={`absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2 py-1 text-center shadow-lg backdrop-blur-md sm:mt-2 sm:px-2.5 sm:py-1.5 ${
                      isCurrent
                        ? "border-amber-300/60 bg-[#061827] ring-1 ring-amber-300/25"
                        : "border-white/15 bg-[#061827]/95"
                    }`}
                  >
                    <strong
                      className={`block text-[9px] sm:text-[10px] ${
                        isCurrent
                          ? "text-amber-200"
                          : "text-white"
                      }`}
                    >
                      {language === "zh"
                        ? point.chinese ||
                          point.label
                        : point.label}
                    </strong>

                    <span
                      lang="zh-CN"
                      className="block text-[8px] text-amber-200/80 sm:text-[9px]"
                    >
                      {language === "zh"
                        ? point.pinyin
                        : point.chinese}
                    </span>
                  </div>
                </div>
              );
            },
          )}

          {points.length > 1 && (
            <div
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-700 ease-linear"
              style={{
                left: `${
                  (flight.x / 1000) *
                  100
                }%`,
                top: `${
                  (flight.y / 620) *
                  100
                }%`,
              }}
            >
              <span className="china-flight-glow absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/40 blur-lg sm:size-11" />

              <span
                className="china-flight-plane relative block"
                style={{
                  transform:
                    `rotate(${flight.rotation}deg)`,
                }}
              >
                <PlaneIcon />
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-3 left-3 z-30 hidden max-w-[230px] rounded-xl border border-white/10 bg-[#061a29]/90 p-3 backdrop-blur-lg sm:bottom-4 sm:left-4 sm:block sm:max-w-xs sm:p-4">
          <strong className="text-xs text-white sm:text-sm">
            {localize(
              "🧭 Chọn đúng thời điểm",
              "🧭 把握时机",
            )}
          </strong>

          <p className="mt-1 text-[10px] leading-4 text-slate-400 sm:text-xs sm:leading-5">
            {localize(
              "Khi máy bay đi qua điểm muốn khám phá, hãy bấm nhảy xuống.",
              "飞机经过你想探索的地点时，点击“跳伞”即可降落。",
            )}
          </p>
        </div>
      </div>

      <footer className="relative z-20 border-t border-white/[0.08] bg-[#061a29]/95 px-4 py-3 backdrop-blur-md sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <span className="text-[9px] font-black tracking-widest text-emerald-300 sm:text-[10px]">
              {localize(
                "VỊ TRÍ HIỆN TẠI",
                "当前位置",
              )}
            </span>

            <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
              <strong className="truncate text-base font-black text-white sm:text-xl">
                {language === "zh"
                  ? currentChinese
                  : currentName}
              </strong>

              {language !== "zh" && (
                <span
                  lang="zh-CN"
                  className="shrink-0 text-sm font-bold text-amber-200 sm:text-base"
                >
                  {currentChinese}
                </span>
              )}
            </div>

            <p className="truncate text-[10px] italic text-slate-400 sm:text-xs">
              {currentPinyin}
            </p>
          </div>

          <button
            type="button"
            onClick={onJump}
            className="min-h-11 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-300 px-5 text-sm font-black text-[#302009] shadow-[0_8px_24px_rgba(251,191,36,.18)] transition hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 sm:w-auto sm:min-w-[210px]"
          >
            {localize(
              "🪂 NHẢY XUỐNG",
              "🪂 立即跳伞",
            )}
          </button>
        </div>
      </footer>
    </section>
  );
}