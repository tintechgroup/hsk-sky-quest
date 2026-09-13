"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
} from "react-simple-maps";

import type { Region } from "@/types/game";

const MAP_DATA_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface FlightPoint {
  regionId: string;
  coordinates: [number, number];
}

const FLIGHT_ROUTE: FlightPoint[] = [
  {
    regionId: "beijing",
    coordinates: [116.4074, 39.9042],
  },
  {
    regionId: "xian",
    coordinates: [108.9398, 34.3416],
  },
  {
    regionId: "chengdu",
    coordinates: [104.0665, 30.5728],
  },
  {
    regionId: "guilin",
    coordinates: [110.2902, 25.2736],
  },
];

interface ChinaFlightMapProps {
  progress: number;
  currentRegion: Region;
  preview?: boolean;
  onJump?: () => void;
}

function getPlanePosition(
  progress: number,
): [number, number] {
  const normalizedProgress =
    ((progress % 100) + 100) % 100;

  const scaledProgress =
    (normalizedProgress / 100) * FLIGHT_ROUTE.length;

  const currentIndex =
    Math.floor(scaledProgress) % FLIGHT_ROUTE.length;

  const nextIndex =
    (currentIndex + 1) % FLIGHT_ROUTE.length;

  const segmentProgress =
    scaledProgress - Math.floor(scaledProgress);

  const currentPoint =
    FLIGHT_ROUTE[currentIndex].coordinates;

  const nextPoint =
    FLIGHT_ROUTE[nextIndex].coordinates;

  const longitude =
    currentPoint[0] +
    (nextPoint[0] - currentPoint[0]) *
      segmentProgress;

  const latitude =
    currentPoint[1] +
    (nextPoint[1] - currentPoint[1]) *
      segmentProgress;

  return [longitude, latitude];
}

function getPlaneRotation(progress: number) {
  const normalizedProgress =
    ((progress % 100) + 100) % 100;

  const scaledProgress =
    (normalizedProgress / 100) * FLIGHT_ROUTE.length;

  const currentIndex =
    Math.floor(scaledProgress) % FLIGHT_ROUTE.length;

  const nextIndex =
    (currentIndex + 1) % FLIGHT_ROUTE.length;

  const currentPoint =
    FLIGHT_ROUTE[currentIndex].coordinates;

  const nextPoint =
    FLIGHT_ROUTE[nextIndex].coordinates;

  const deltaX = nextPoint[0] - currentPoint[0];
  const deltaY = nextPoint[1] - currentPoint[1];

  return Math.atan2(-deltaY, deltaX) * (180 / Math.PI);
}

function getRegionName(regionId: string) {
  switch (regionId) {
    case "beijing":
      return "Bắc Kinh";

    case "xian":
      return "Tây An";

    case "chengdu":
      return "Thành Đô";

    case "guilin":
      return "Quế Lâm";

    default:
      return "";
  }
}

export default function ChinaFlightMap({
  progress,
  currentRegion,
  preview = false,
  onJump,
}: ChinaFlightMapProps) {
  const planePosition = getPlanePosition(progress);
  const planeRotation = getPlaneRotation(progress);

  return (
    <section className="flight-map-shell">
      <div className="flight-map-topbar">
        <div className="flight-status">
          <span className="flight-live-dot" />

          <span>
            {preview
              ? "Tuyến khám phá đất liền"
              : "Chuyến bay đang hoạt động"}
          </span>
        </div>

        <span className="flight-map-progress">
          {Math.round(progress)}%
        </span>
      </div>

      <div className="flight-map">
        <div className="flight-map-sun" />

        <div className="flight-map-cloud flight-cloud-one">
          ☁
        </div>

        <div className="flight-map-cloud flight-cloud-two">
          ☁
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            center: [104, 36],
            scale: 790,
          }}
          width={1000}
          height={620}
          className="china-svg-map"
          aria-label="Bản đồ tuyến bay trên đất liền Trung Quốc"
        >
          <defs>
            {/* Màu sắc minh họa vùng trải nghiệm */}
            <pattern
              id="chinaColorMap"
              width="1000"
              height="620"
              patternUnits="userSpaceOnUse"
            >
              <rect
                width="1000"
                height="620"
                fill="#f5c242"
              />

              <path
                d="M0 0 H430 L460 180 L360 310 L0 340 Z"
                fill="#f44f4f"
              />

              <path
                d="M320 0 H650 L670 190 L490 290 L400 170 Z"
                fill="#ff922f"
              />

              <path
                d="M610 0 H1000 V250 L790 310 L650 180 Z"
                fill="#55b3e4"
              />

              <path
                d="M0 300 L350 270 L480 430 L330 620 H0 Z"
                fill="#67b5d8"
              />

              <path
                d="M330 230 L590 190 L680 390 L510 540 L410 430 Z"
                fill="#93cf22"
              />

              <path
                d="M570 180 L820 200 L850 410 L650 480 L610 340 Z"
                fill="#ff872b"
              />

              <path
                d="M780 230 H1000 V500 L810 560 L700 410 Z"
                fill="#ed5d67"
              />

              <path
                d="M430 410 L690 350 L790 620 H480 L340 530 Z"
                fill="#4ac4ca"
              />

              <path
                d="M680 400 L1000 370 V620 H750 Z"
                fill="#a2cd31"
              />

              {/* Các đường chia vùng trang trí */}
              <g
                fill="none"
                stroke="#fff3c3"
                strokeWidth="5"
                opacity="0.46"
              >
                <path d="M430 0 L400 170 L490 290 L350 270" />
                <path d="M650 0 L650 180 L790 310" />
                <path d="M350 270 L480 430 L340 530" />
                <path d="M590 190 L610 340 L510 540" />
                <path d="M820 200 L700 410 L790 620" />
              </g>

              {/* Chấm trang trí địa hình */}
              <g
                fill="#ffffff"
                opacity="0.16"
              >
                <circle cx="230" cy="210" r="8" />
                <circle cx="265" cy="232" r="5" />
                <circle cx="485" cy="290" r="7" />
                <circle cx="525" cy="315" r="5" />
                <circle cx="700" cy="220" r="8" />
                <circle cx="738" cy="249" r="5" />
                <circle cx="615" cy="480" r="8" />
                <circle cx="650" cy="510" r="5" />
              </g>
            </pattern>

            {/* Gradient máy bay */}
            <linearGradient
              id="airplaneBody"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#ffffff"
              />

              <stop
                offset="45%"
                stopColor="#edf4f7"
              />

              <stop
                offset="100%"
                stopColor="#91aab6"
              />
            </linearGradient>

            <linearGradient
              id="airplaneWing"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#e7fbff"
              />

              <stop
                offset="100%"
                stopColor="#759bab"
              />
            </linearGradient>

            <linearGradient
              id="airplaneWindow"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#80eaff"
              />

              <stop
                offset="100%"
                stopColor="#075b87"
              />
            </linearGradient>

            <radialGradient id="airplaneRadar">
              <stop
                offset="0%"
                stopColor="#ffd166"
                stopOpacity="0.3"
              />

              <stop
                offset="70%"
                stopColor="#ffd166"
                stopOpacity="0.08"
              />

              <stop
                offset="100%"
                stopColor="#ffd166"
                stopOpacity="0"
              />
            </radialGradient>

            <filter
              id="chinaShadow"
              x="-30%"
              y="-30%"
              width="160%"
              height="160%"
            >
              <feDropShadow
                dx="0"
                dy="18"
                stdDeviation="14"
                floodColor="#00111f"
                floodOpacity="0.62"
              />
            </filter>

            <filter
              id="realPlaneShadow"
              x="-150%"
              y="-150%"
              width="400%"
              height="400%"
            >
              <feDropShadow
                dx="0"
                dy="7"
                stdDeviation="6"
                floodColor="#00121e"
                floodOpacity="0.9"
              />

              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="9"
                floodColor="#ffd166"
                floodOpacity="0.9"
              />
            </filter>

            <filter
              id="lightGlow"
              x="-400%"
              y="-400%"
              width="900%"
              height="900%"
            >
              <feGaussianBlur
                stdDeviation="2.5"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Bản đồ */}
          <Geographies geography={MAP_DATA_URL}>
            {({ geographies }) =>
              geographies.map((geography) => {
                const countryName =
                  geography.properties?.name;

                const isChina =
                  String(geography.id) === "156" ||
                  countryName === "China";

                if (!isChina) return null;

                return (
                  <Geography
                    key={geography.rsmKey}
                    geography={geography}
                    fill="url(#chinaColorMap)"
                    stroke="#ffe082"
                    strokeWidth={2.3}
                    filter="url(#chinaShadow)"
                    style={{
                      default: {
                        outline: "none",
                      },
                      hover: {
                        fill: "url(#chinaColorMap)",
                        outline: "none",
                      },
                      pressed: {
                        outline: "none",
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>

          {/* Tuyến bay nét đứt */}
          {FLIGHT_ROUTE.map((point, index) => {
            const nextPoint =
              FLIGHT_ROUTE[
                (index + 1) % FLIGHT_ROUTE.length
              ];

            return (
              <Line
                key={`${point.regionId}-${nextPoint.regionId}`}
                from={point.coordinates}
                to={nextPoint.coordinates}
                stroke="#ffffff"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray="4 12"
                opacity={0.95}
              />
            );
          })}

          {/* Các điểm đến */}
          {FLIGHT_ROUTE.map((point) => {
            const isActive =
              point.regionId === currentRegion.id;

            return (
              <Marker
                key={point.regionId}
                coordinates={point.coordinates}
              >
                {isActive && (
                  <>
                    <circle
                      r={33}
                      fill="#ffd166"
                      opacity={0.25}
                      className="flight-radar-ring"
                    />

                    <circle
                      r={22}
                      fill="none"
                      stroke="#fff1b8"
                      strokeWidth={2}
                      opacity={0.9}
                    />
                  </>
                )}

                <circle
                  r={isActive ? 12 : 10}
                  fill={isActive ? "#ffd166" : "#ffffff"}
                  stroke="#07364c"
                  strokeWidth={4}
                />

                <text
                  textAnchor="middle"
                  y={-28}
                  className="flight-city-label"
                >
                  {getRegionName(point.regionId)}
                </text>
              </Marker>
            );
          })}

          {/* Máy bay */}
          <Marker coordinates={planePosition}>
            <g className="flight-airplane-wrapper">
              {/* Vùng phát sáng */}
              <circle
                r={58}
                fill="url(#airplaneRadar)"
                className="flight-airplane-glow"
              />

              {/* Vòng radar xoay */}
              <circle
                r={46}
                fill="none"
                stroke="#ffd166"
                strokeWidth={2}
                strokeDasharray="7 7"
                className="flight-plane-radar"
              />

              <g
                transform={`rotate(${planeRotation}) scale(1.15)`}
                filter="url(#realPlaneShadow)"
                className="flight-real-airplane"
              >
                {/* Cánh trên */}
                <path
                  d="
                    M 9 -5
                    L -10 -33
                    Q -13 -38 -19 -37
                    L -25 -34
                    L -13 -4
                    L 7 4
                    Z
                  "
                  fill="url(#airplaneWing)"
                  stroke="#375d6e"
                  strokeWidth={1.5}
                />

                {/* Cánh dưới */}
                <path
                  d="
                    M 9 5
                    L -10 33
                    Q -13 38 -19 37
                    L -25 34
                    L -13 4
                    L 7 -4
                    Z
                  "
                  fill="url(#airplaneWing)"
                  stroke="#375d6e"
                  strokeWidth={1.5}
                />

                {/* Đuôi */}
                <path
                  d="
                    M -25 -3
                    L -37 -17
                    L -42 -15
                    L -35 0
                    L -42 15
                    L -37 17
                    L -25 3
                    Z
                  "
                  fill="#d9e9ed"
                  stroke="#375d6e"
                  strokeWidth={1.5}
                />

                {/* Thân */}
                <path
                  d="
                    M 42 0
                    Q 34 -9 20 -10
                    L -28 -8
                    Q -37 -7 -41 0
                    Q -37 7 -28 8
                    L 20 10
                    Q 34 9 42 0
                    Z
                  "
                  fill="url(#airplaneBody)"
                  stroke="#31596a"
                  strokeWidth={2}
                />

                {/* Kính lái */}
                <path
                  d="
                    M 27 -5
                    Q 36 -3 39 0
                    Q 36 3 27 5
                    Q 30 0 27 -5
                    Z
                  "
                  fill="url(#airplaneWindow)"
                  stroke="#064d71"
                  strokeWidth={1}
                />

                {/* Sọc đỏ */}
                <path
                  d="M -24 0 L 24 0"
                  fill="none"
                  stroke="#ef4d56"
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />

                {/* Động cơ */}
                <ellipse
                  cx="-6"
                  cy="-18"
                  rx="7"
                  ry="4.5"
                  fill="#426878"
                  stroke="#e4f9fc"
                  strokeWidth={1}
                />

                <ellipse
                  cx="-6"
                  cy="18"
                  rx="7"
                  ry="4.5"
                  fill="#426878"
                  stroke="#e4f9fc"
                  strokeWidth={1}
                />

                {/* Đèn đỏ nhấp nháy */}
                <circle
                  cx="-20"
                  cy="-35"
                  r="3.5"
                  fill="#ff3045"
                  filter="url(#lightGlow)"
                  className="flight-plane-red-light"
                />

                {/* Đèn xanh nhấp nháy */}
                <circle
                  cx="-20"
                  cy="35"
                  r="3.5"
                  fill="#27f29c"
                  filter="url(#lightGlow)"
                  className="flight-plane-green-light"
                />

                {/* Đèn đầu máy bay */}
                <circle
                  cx="40"
                  cy="0"
                  r="3"
                  fill="#ffffff"
                  filter="url(#lightGlow)"
                  className="flight-plane-head-light"
                />
              </g>
            </g>
          </Marker>
        </ComposableMap>

        <div className="flight-map-title">
          <strong>中华探索之旅</strong>
          <span>Hành trình khám phá Trung Hoa</span>
        </div>

        <div className="flight-map-note">
          Màu sắc minh họa vùng trải nghiệm
        </div>
      </div>

      {!preview && (
        <div className="flight-location-panel">
          <div className="flight-location-icon">📍</div>

          <div className="flight-location-content">
            <span>ĐANG ĐI QUA</span>

            <h2>
              {currentRegion.name} ·{" "}
              <span lang="zh-CN">
                {currentRegion.chineseName}
              </span>
            </h2>

            <p>{currentRegion.pinyin}</p>
          </div>

          <button
            type="button"
            className="flight-jump-button"
            onClick={onJump}
            disabled={!onJump}
          >
            <span>🪂</span>
            Nhảy dù tại đây
          </button>
        </div>
      )}
    </section>
  );
}