"use client";

import type { FormEvent } from "react";

import ChinaFlightMap from "@/components/game/ChinaFlightMap";
import { regions } from "@/data/regions";
import type { HSKLevel } from "@/types/game";

const HSK_LEVELS: HSKLevel[] = [3, 4, 5, 6];

interface WelcomeScreenProps {
  level: HSKLevel;
  onLevelChange: (level: HSKLevel) => void;
  onStart: () => void;
}

export default function WelcomeScreen({
  level,
  onLevelChange,
  onStart,
}: WelcomeScreenProps) {
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    onStart();
  }

  return (
    <section className="welcome-screen">
      <div className="welcome-map-layer">
        <ChinaFlightMap
          progress={4}
          currentRegion={regions[0]}
          preview
        />
      </div>

      <div className="welcome-dark-layer" />

      <div className="welcome-content">
        <div className="welcome-logo">
          <div className="welcome-logo-icon">✈</div>

          <div>
            <strong>HSK SKY QUEST</strong>
            <span>LEARN · EXPLORE · CONQUER</span>
          </div>
        </div>

        <div className="welcome-card">
          <div className="welcome-label">
            <span />
            HÀNH TRÌNH HỌC TIẾNG TRUNG
          </div>

          <h1>
            Chào mừng bạn đến với
            <span> HSK Sky Quest</span>
          </h1>

          <p className="welcome-description">
            Bay qua những vùng đất nổi tiếng, khám phá địa
            lý, văn hóa Trung Quốc và chinh phục kiến thức
            HSK qua từng thử thách.
          </p>

          <div className="welcome-features">
            <div>
              <span>🗺️</span>
              <p>
                <strong>Khám phá</strong>
                Địa lý và văn hóa
              </p>
            </div>

            <div>
              <span>🪂</span>
              <p>
                <strong>Trải nghiệm</strong>
                Tự chọn nơi nhảy dù
              </p>
            </div>

            <div>
              <span>📖</span>
              <p>
                <strong>Học tập</strong>
                HSK từ cấp 3 đến 6
              </p>
            </div>
          </div>

          <form
            className="welcome-form"
            onSubmit={handleSubmit}
          >
            <fieldset>
              <legend>Chọn trình độ hiện tại của bạn</legend>

              <div className="welcome-level-list">
                {HSK_LEVELS.map((hskLevel) => (
                  <label
                    key={hskLevel}
                    className={
                      level === hskLevel
                        ? "welcome-level active"
                        : "welcome-level"
                    }
                  >
                    <input
                      type="radio"
                      name="hsk-level"
                      value={hskLevel}
                      checked={level === hskLevel}
                      onChange={() =>
                        onLevelChange(hskLevel)
                      }
                    />

                    <span>HSK</span>
                    <strong>{hskLevel}</strong>
                  </label>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              className="welcome-start-button"
            >
              <span>Bắt đầu hành trình</span>
              <b>→</b>
            </button>
          </form>

          <p className="welcome-note">
            ✦ Mỗi hành trình là một trải nghiệm học tập mới
          </p>
        </div>
      </div>

      <div className="welcome-location">
        <span>📍</span>

        <div>
          <small>TUYẾN KHÁM PHÁ</small>
          <strong>Đất liền Trung Quốc</strong>
        </div>
      </div>
    </section>
  );
}