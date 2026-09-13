"use client";

import { useEffect, useState } from "react";

import ChinaFlightMap from "@/components/game/ChinaFlightMap";
import LootScreen from "@/components/game/LootScreen";
import WelcomeScreen from "@/components/game/WelcomeScreen";
import { regions } from "@/data/regions";

import type {
  GamePhase,
  HSKLevel,
  Region,
} from "@/types/game";

const FLIGHT_INTERVAL = 160;
const FLIGHT_STEP = 0.35;
const PARACHUTE_DURATION = 2500;

export default function Game() {
  const [phase, setPhase] =
    useState<GamePhase>("start");

  const [level, setLevel] =
    useState<HSKLevel>(3);

  const [flightProgress, setFlightProgress] =
    useState(0);

  const [landingRegion, setLandingRegion] =
    useState<Region | null>(null);

  const regionIndex = Math.min(
    regions.length - 1,
    Math.floor(
      (flightProgress / 100) * regions.length,
    ),
  );

  const currentRegion =
    regions[regionIndex] ?? regions[0];

  /*
   * Cho máy bay di chuyển liên tục khi đang bay.
   */
  useEffect(() => {
    if (phase !== "flight") return;

    const timer = window.setInterval(() => {
      setFlightProgress((previousProgress) => {
        return (
          previousProgress + FLIGHT_STEP
        ) % 100;
      });
    }, FLIGHT_INTERVAL);

    return () => {
      window.clearInterval(timer);
    };
  }, [phase]);

  /*
   * Sau 2,5 giây nhảy dù sẽ chuyển sang
   * màn hình thu thập vật phẩm.
   */
  useEffect(() => {
    if (phase !== "parachuting") return;

    const timer = window.setTimeout(() => {
      setPhase("landed");
    }, PARACHUTE_DURATION);

    return () => {
      window.clearTimeout(timer);
    };
  }, [phase]);

  function startGame() {
    setFlightProgress(0);
    setLandingRegion(null);
    setPhase("flight");
  }

  function jump() {
    if (phase !== "flight" || !currentRegion) {
      return;
    }

    setLandingRegion(currentRegion);
    setPhase("parachuting");
  }

  function restart() {
    setPhase("start");
    setFlightProgress(0);
    setLandingRegion(null);
  }

  return (
    <main className="hsk-game">
      <div className="hsk-container">
        {/* Màn hình chào */}
        {phase === "start" && (
          <WelcomeScreen
            level={level}
            onLevelChange={setLevel}
            onStart={startGame}
          />
        )}

        {/* Màn hình chuyến bay */}
        {phase === "flight" && currentRegion && (
          <>
            <header className="game-flight-header">
              <div className="game-brand">
                <div className="game-brand-icon">
                  ✈
                </div>

                <div>
                  <strong>HSK SKY QUEST</strong>
                  <span>
                    Học tiếng Trung qua trải nghiệm
                  </span>
                </div>
              </div>

              <div className="game-player-information">
                <span>Trình độ hiện tại</span>
                <strong>HSK {level}</strong>
              </div>
            </header>

            <ChinaFlightMap
              progress={flightProgress}
              currentRegion={currentRegion}
              onJump={jump}
            />

            <section
              className="flight-region-information"
              aria-live="polite"
            >
              <div className="flight-region-heading">
                <div>
                  <span className="flight-region-label">
                    KHÁM PHÁ VÙNG ĐẤT
                  </span>

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
                  className="flight-back-button"
                  onClick={restart}
                >
                  ← Quay lại
                </button>
              </div>

              <div className="flight-knowledge-grid">
                <article>
                  <div className="flight-knowledge-icon">
                    🌏
                  </div>

                  <div>
                    <span>ĐỊA LÝ</span>
                    <p>{currentRegion.geography}</p>
                  </div>
                </article>

                <article>
                  <div className="flight-knowledge-icon">
                    🏮
                  </div>

                  <div>
                    <span>VĂN HÓA</span>
                    <p>{currentRegion.culture}</p>
                  </div>
                </article>

                <article>
                  <div className="flight-knowledge-icon">
                    🏯
                  </div>

                  <div>
                    <span>ĐỊA DANH NỔI BẬT</span>
                    <p>{currentRegion.landmark}</p>
                  </div>
                </article>
              </div>

              <p className="flight-research-note">
                Nội dung giới thiệu giúp người chơi tiếp
                nhận kiến thức địa lý và văn hóa trước khi
                quyết định nhảy dù.
              </p>
            </section>
          </>
        )}

        {/* Màn hình nhảy dù */}
        {phase === "parachuting" &&
          landingRegion && (
            <section
              className="parachute-screen"
              role="status"
              aria-live="polite"
            >
              <div className="parachute-cloud cloud-one">
                ☁
              </div>

              <div className="parachute-cloud cloud-two">
                ☁
              </div>

              <div className="parachute-animation">
                <div className="parachute-icon">
                  🪂
                </div>
              </div>

              <span className="parachute-label">
                ĐANG TIẾP CẬN ĐIỂM ĐẾN
              </span>

              <h2>
                Đang nhảy xuống {landingRegion.name}
              </h2>

              <p>
                <span lang="zh-CN">
                  {landingRegion.chineseName}
                </span>{" "}
                · {landingRegion.pinyin}
              </p>

              <div className="parachute-loading">
                <span />
              </div>

              <small>
                Chuẩn bị tiếp đất và thu thập vật phẩm
              </small>
            </section>
          )}

        {/* Màn hình nhặt vật phẩm */}
        {phase === "landed" &&
          landingRegion && (
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