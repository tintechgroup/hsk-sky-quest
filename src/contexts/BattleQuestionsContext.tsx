"use client";

import {
  createContext,
  useContext,
  useMemo,
} from "react";

import type {
  ReactNode,
} from "react";

import type {
  GameQuestion,
} from "@/types/question";

interface BattleQuestionsContextValue {
  questions: GameQuestion[];
  questionCount: number;
}

interface BattleQuestionsProviderProps {
  questions: GameQuestion[];
  children: ReactNode;
}

const BattleQuestionsContext =
  createContext<
    BattleQuestionsContextValue | undefined
  >(undefined);

export function BattleQuestionsProvider({
  questions,
  children,
}: BattleQuestionsProviderProps) {
  const safeQuestions = useMemo(() => {
    if (!Array.isArray(questions)) {
      return [];
    }

    return questions.filter(
      (question) => {
        return (
          Boolean(question.id) &&
          Boolean(
            question.question?.trim(),
          ) &&
          Array.isArray(
            question.options,
          ) &&
          question.options.length >= 2 &&
          Number.isInteger(
            question.correctIndex,
          ) &&
          question.correctIndex >= 0 &&
          question.correctIndex <
            question.options.length
        );
      },
    );
  }, [questions]);

  const value =
    useMemo<BattleQuestionsContextValue>(
      () => ({
        questions: safeQuestions,
        questionCount:
          safeQuestions.length,
      }),
      [safeQuestions],
    );

  return (
    <BattleQuestionsContext.Provider
      value={value}
    >
      {children}
    </BattleQuestionsContext.Provider>
  );
}

export function useBattleQuestionsContext() {
  const context = useContext(
    BattleQuestionsContext,
  );

  if (!context) {
    throw new Error(
      "useBattleQuestionsContext phải được sử dụng bên trong BattleQuestionsProvider.",
    );
  }

  return context;
}