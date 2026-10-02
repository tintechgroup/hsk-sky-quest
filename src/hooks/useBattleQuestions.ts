"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getBattleQuestions,
} from "@/lib/question-client";

import type {
  HSKLevel,
} from "@/types/game";

import type {
  GameQuestion,
} from "@/types/question";

interface UseBattleQuestionsOptions {
  regionId: string;

  level: HSKLevel;

  limit?: number;

  enabled?: boolean;
}

interface UseBattleQuestionsResult {
  questions: GameQuestion[];

  loading: boolean;

  error: string;

  hasEnoughQuestions: boolean;

  reload: () => Promise<void>;
}

export function useBattleQuestions({
  regionId,
  level,
  limit = 3,
  enabled = true,
}: UseBattleQuestionsOptions): UseBattleQuestionsResult {
  const [
    questions,
    setQuestions,
  ] =
    useState<
      GameQuestion[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  /*
   * Mỗi lần load sẽ có một ID mới.
   *
   * Nếu người dùng đổi tỉnh / HSK quá nhanh,
   * request cũ không được phép ghi đè
   * kết quả của request mới.
   */
  const requestIdRef =
    useRef(0);

  /*
   * Theo dõi component còn mount hay không.
   */
  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;
    };
  }, []);

  /*
   * ========================================
   * LOAD QUESTIONS
   * ========================================
   */
  const loadQuestions =
    useCallback(
      async () => {
        /*
         * Tăng request ID để vô hiệu hóa
         * các request cũ đang chạy.
         */
        const requestId =
          requestIdRef.current +
          1;

        requestIdRef.current =
          requestId;

        /*
         * Không load nếu hook bị disable
         * hoặc chưa có regionId.
         */
        if (
          !enabled ||
          !regionId
        ) {
          if (
            mountedRef.current &&
            requestId ===
              requestIdRef.current
          ) {
            setQuestions(
              [],
            );

            setError(
              "",
            );

            setLoading(
              false,
            );
          }

          return;
        }

        if (
          mountedRef.current &&
          requestId ===
            requestIdRef.current
        ) {
          setLoading(
            true,
          );

          setError(
            "",
          );
        }

        try {
          const loadedQuestions =
            await getBattleQuestions(
              regionId,
              level,
              limit,
            );

          /*
           * Component đã unmount hoặc
           * đã có request mới hơn:
           * bỏ kết quả này.
           */
          if (
            !mountedRef.current ||
            requestId !==
              requestIdRef.current
          ) {
            return;
          }

          setQuestions(
            loadedQuestions,
          );

          /*
           * Không có câu hỏi.
           */
          if (
            loadedQuestions.length ===
            0
          ) {
            setError(
              `Tỉnh/thành này chưa có câu hỏi HSK ${level}. Vui lòng thêm câu hỏi trong trang quản trị.`,
            );

            return;
          }

          /*
           * Có câu hỏi nhưng chưa đủ số lượng.
           */
          if (
            loadedQuestions.length <
            limit
          ) {
            setError(
              `Hiện chỉ có ${loadedQuestions.length}/${limit} câu hỏi HSK ${level}. Vui lòng thêm đủ câu hỏi để bắt đầu trận đấu.`,
            );

            return;
          }

          /*
           * Đủ câu hỏi.
           */
          setError(
            "",
          );
        } catch (
          loadError
        ) {
          if (
            !mountedRef.current ||
            requestId !==
              requestIdRef.current
          ) {
            return;
          }

          console.warn(
            "Không thể tải câu hỏi:",
            loadError,
          );

          setQuestions(
            [],
          );

          setError(
            loadError instanceof
            Error
              ? loadError.message
              : "Không thể tải câu hỏi từ MongoDB.",
          );
        } finally {
          /*
           * Chỉ request mới nhất
           * mới được tắt loading.
           */
          if (
            mountedRef.current &&
            requestId ===
              requestIdRef.current
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        enabled,
        regionId,
        level,
        limit,
      ],
    );

  /*
   * ========================================
   * AUTO LOAD
   * ========================================
   *
   * Không gọi:
   *
   * useEffect(() => {
   *   void loadQuestions();
   * }, [loadQuestions]);
   *
   * vì loadQuestions có setState đồng bộ
   * ở đầu hàm và React ESLint mới sẽ báo:
   *
   * react-hooks/set-state-in-effect
   *
   * Schedule qua setTimeout để callback
   * chạy sau effect.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadQuestions();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    loadQuestions,
  ]);

  /*
   * ========================================
   * RESULT
   * ========================================
   */

  const hasEnoughQuestions =
    questions.length >=
    limit;

  return {
    questions,

    loading,

    error,

    hasEnoughQuestions,

    reload:
      loadQuestions,
  };
}