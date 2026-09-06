"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import LootScreen from "@/components/game/LootScreen";
import { regions } from "@/data/regions";
import type { GamePhase, HSKLevel, Region } from "@/types/game";

const LEVELS: HSKLevel[] = [3, 4, 5, 6];

const FLIGHT_INTERVAL = 200;
const FLIGHT_STEP = 0.5;
const PARACHUTE_DURATION = 2500;

export default function Game() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [level, setLevel] = useState<HSKLevel>(3);
  const [flightProgress, setFlightProgress] = useState(0);
  const [landingRegion, setLandingRegion] = useState<Region | null>(
    null,
  );

  const regionIndex = Math.min(
    regions.length - 1,
    Math.floor((flightProgress / 100) * regions.length),
  );

  const currentRegion = regions[regionIndex];

  // Máy bay di chuyển khi đang ở màn hình chuyến bay.
  useEffect(() => {
    if (phase !== "flight") return;

    const timer = window.setInterval(() => {
      setFlightProgress(
        (previous) => (previous + FLIGHT_STEP) % 100,
      );
    }, FLIGHT_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase]);

  // Sau khi nhảy dù, chuyển sang màn hình nhặt vật phẩm.
  useEffect(() => {
    if (phase !== "parachuting") return;

    const timer = window.setTimeout(() => {
      setPhase("landed");
    }, PARACHUTE_DURATION);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentRegion) return;

    setFlightProgress(0);
    setLandingRegion(null);
    setPhase("flight");
  }

  function jump() {
    if (phase !== "flight" || !currentRegion) return;

    // Chốt địa điểm tại thời điểm người chơi nhảy.
    setLandingRegion(currentRegion);
    setPhase("parachuting");
  }

  function restart() {
    setPhase("start");
    setFlightProgress(0);
    setLandingRegion(null);
    // Giữ lại trình độ HSK người chơi đã chọn.
  }

  return (
    <main className="hsk-game">
      <div className="hsk-container">
        <header className="hsk-header">
          <div>
            <p className="hsk-eyebrow">
              HỌC TIẾNG TRUNG QUA TRẢI NGHIỆM
            </p>

            <h1>HSK Sky Quest</h1>
          </div>

          <span className="hsk-badge">HSK {level}</span>
        </header>

        {/* 1. Chọn trình độ */}
        {phase === "start" && (
          <section className="hsk-card hsk-start">
            <div
              className="hsk-big-icon"
              aria-hidden="true"
            >
              ✈️
            </div>

            <h2>Sẵn sàng cho chuyến khám phá?</h2>

            <p>
              Chọn trình độ HSK, lên máy bay và khám phá
              địa lý, văn hóa Trung Quốc trước khi nhảy dù.
            </p>

            <form onSubmit={startGame}>
              <fieldset className="hsk-level-field">
                <legend>Chọn trình độ của bạn</legend>

                <div className="hsk-level-options">
                  {LEVELS.map((hskLevel) => (
                    <label
                      key={hskLevel}
                      className={`hsk-level-choice ${
                        level === hskLevel ? "active" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="hsk-level"
                        value={hskLevel}
                        checked={level === hskLevel}
                        onChange={() => setLevel(hskLevel)}
                      />

                      <span>HSK {hskLevel}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button
                type="submit"
                className="hsk-primary"
                disabled={!currentRegion}
              >
                Lên máy bay
              </button>
            </form>

            <p className="hsk-note">
              Bản hiện tại mô phỏng hành trình của một
              người chơi, chưa kết nối phòng chơi trực tuyến.
            </p>

            {!currentRegion && (
              <p role="alert" className="hsk-note">
                Chưa có dữ liệu địa điểm. Hãy kiểm tra
                file src/data/regions.ts.
              </p>
            )}
          </section>
        )}

        {/* 2. Bay và giới thiệu địa điểm trước khi nhảy */}
        {phase === "flight" && currentRegion && (
          <section className="hsk-card">
            <h2>Chuyến bay khám phá</h2>

            <p>
              Đọc giới thiệu về khu vực đang đi qua.
              Bạn có thể quyết định thời điểm nhảy dù.
            </p>

            <div className="hsk-flight">
              <p className="hsk-route-label">
                Sơ đồ tuyến bay — các điểm đến đất liền
              </p>

              <div
                className="hsk-track"
                role="progressbar"
                aria-label="Tiến trình chuyến bay"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(flightProgress)}
                aria-valuetext={`Đang đi qua ${currentRegion.name}`}
              >
                <div
                  className="hsk-track-fill"
                  style={{ width: `${flightProgress}%` }}
                />

                <span
                  className="hsk-plane"
                  style={{ left: `${flightProgress}%` }}
                  aria-hidden="true"
                >
                  ✈️
                </span>
              </div>

              <div className="hsk-stops">
                {regions.map((region, index) => (
                  <div
                    key={region.id}
                    className={`hsk-stop ${
                      index === regionIndex ? "active" : ""
                    }`}
                  >
                    <span>{region.name}</span>
                    <small lang="zh-CN">
                      {region.chineseName}
                    </small>
                  </div>
                ))}
              </div>
            </div>

            <article
              className="hsk-region"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="hsk-eyebrow">
                KHU VỰC ĐANG ĐI QUA
              </p>

              <h3>
                {currentRegion.name} ·{" "}
                <span lang="zh-CN">
                  {currentRegion.chineseName}
                </span>
              </h3>

              <p className="hsk-pinyin">
                {currentRegion.pinyin}
              </p>

              <dl className="hsk-facts">
                <div>
                  <dt>🌏 Địa lý</dt>
                  <dd>{currentRegion.geography}</dd>
                </div>

                <div>
                  <dt>🏮 Văn hóa</dt>
                  <dd>{currentRegion.culture}</dd>
                </div>

                <div>
                  <dt>📍 Địa danh nổi bật</dt>
                  <dd>{currentRegion.landmark}</dd>
                </div>
              </dl>
            </article>

            <div className="hsk-actions">
              <button
                type="button"
                className="hsk-primary"
                onClick={jump}
              >
                🪂 Nhảy xuống {currentRegion.name}
              </button>

              <button
                type="button"
                className="hsk-secondary"
                onClick={restart}
              >
                Quay lại
              </button>
            </div>

            <p className="hsk-note">
              Đây là sơ đồ mô phỏng các điểm đến trên
              đất liền, chưa phải đường bay trên bản đồ
              địa lý thực. Tuyến bay lặp lại để bạn thử
              chọn địa điểm.
            </p>
          </section>
        )}

        {/* 3. Nhảy dù */}
        {phase === "parachuting" && landingRegion && (
          <section
            className="hsk-card hsk-center"
            role="status"
            aria-live="polite"
          >
            <div
              className="hsk-big-icon"
              aria-hidden="true"
            >
              🪂
            </div>

            <p className="hsk-eyebrow">
              ĐANG NHẢY DÙ
            </p>

            <h2>
              Đang nhảy xuống {landingRegion.name}
            </h2>

            <p>
              <span lang="zh-CN">
                {landingRegion.chineseName}
              </span>{" "}
              · {landingRegion.pinyin}
            </p>

            <p>
              Chuẩn bị tiếp đất và thu thập vật phẩm
              hỗ trợ trả lời câu hỏi.
            </p>
          </section>
        )}

        {/* 4. Tiếp đất → nhặt vật phẩm */}
        {phase === "landed" && landingRegion && (
          <LootScreen
            key={landingRegion.id}
            region={landingRegion}
            level={level}
            onRestart={restart}
          />
        )}
      </div>
    </main>
  );
}