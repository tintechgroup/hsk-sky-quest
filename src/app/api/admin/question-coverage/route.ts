import { NextResponse } from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth";

import connectMongoDB from "@/lib/mongodb";

import QuestionModel from "@/models/Question";
import RegionModel from "@/models/Region";
import UserModel from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HSK_LEVELS = [
  3,
  4,
  5,
  6,
] as const;

type HSKLevel =
  (typeof HSK_LEVELS)[number];

interface CoverageLevelMap {
  3: number;
  4: number;
  5: number;
  6: number;
}

interface CoverageRegionItem {
  regionId: string;

  regionName: string;

  chineseName: string;

  pinyin: string;

  slug: string;

  isActive: boolean;

  levels: CoverageLevelMap;

  total: number;

  activeTotal: number;

  inactiveTotal: number;

  missingLevels: HSKLevel[];

  insufficientLevels: HSKLevel[];

  readyLevels: HSKLevel[];

  isFullyReady: boolean;
}

/**
 * Số câu tối thiểu cho mỗi HSK
 * để coi là đủ dữ liệu ghép trận.
 */
const MIN_QUESTIONS_PER_LEVEL = 3;

/**
 * Kiểm tra admin:
 *
 * JWT
 * -> userId
 * -> MongoDB
 * -> role === "admin"
 */
async function isAdminRequest() {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return false;
    }

    await connectMongoDB();

    const user =
      await UserModel.findOne({
        _id: userId,

        role: "admin",

        isActive: {
          $ne: false,
        },

        status: {
          $nin: [
            "blocked",
            "inactive",
          ],
        },
      })
        .select(
          "_id role status isActive",
        )
        .lean();

    return Boolean(user);
  } catch (error) {
    console.error(
      "Question coverage admin check:",
      error,
    );

    return false;
  }
}

/**
 * Tạo object count mặc định.
 */
function createEmptyLevels():
  CoverageLevelMap {
  return {
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };
}

/**
 * GET
 * /api/admin/question-coverage
 *
 * Trả về thống kê số câu hỏi
 * theo từng tỉnh và từng cấp HSK.
 */
export async function GET() {
  try {
    /**
     * Chỉ admin được xem dashboard.
     */
    if (
      !(await isAdminRequest())
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            "Bạn không có quyền xem thống kê câu hỏi.",
        },
        {
          status: 403,
        },
      );
    }

    await connectMongoDB();

    /**
     * Lấy toàn bộ tỉnh.
     *
     * Admin cần thấy cả tỉnh đang hoạt động
     * và tỉnh đã ẩn.
     */
    const regions =
      await RegionModel.find({})
        .select(
          "_id name chineseName pinyin slug isActive flightOrder",
        )
        .sort({
          flightOrder: 1,
          name: 1,
        })
        .lean();

    /**
     * Aggregate toàn bộ câu hỏi.
     *
     * Nhóm theo:
     *
     * region
     * level
     * isActive
     *
     * Ví dụ:
     *
     * region A
     * HSK 3
     * active = true
     * count = 5
     */
    const questionStats =
      await QuestionModel.aggregate([
        {
          $match: {
            level: {
              $in: [
                3,
                4,
                5,
                6,
              ],
            },
          },
        },

        {
          $group: {
            _id: {
              region:
                "$region",

              level:
                "$level",

              isActive:
                "$isActive",
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    /**
     * Map để lookup nhanh.
     *
     * key:
     * regionId
     */
    const regionStatsMap =
      new Map<
        string,
        {
          levels:
            CoverageLevelMap;

          activeLevels:
            CoverageLevelMap;

          inactiveLevels:
            CoverageLevelMap;

          total: number;

          activeTotal: number;

          inactiveTotal: number;
        }
      >();

    for (
      const stat of
      questionStats
    ) {
      const regionId =
        String(
          stat?._id
            ?.region ?? "",
        );

      const level =
        Number(
          stat?._id
            ?.level,
        );

      const isActive =
        stat?._id
          ?.isActive !==
        false;

      const count =
        Number(
          stat?.count ??
            0,
        );

      if (
        !regionId ||
        !HSK_LEVELS.includes(
          level as HSKLevel,
        )
      ) {
        continue;
      }

      if (
        !regionStatsMap.has(
          regionId,
        )
      ) {
        regionStatsMap.set(
          regionId,
          {
            levels:
              createEmptyLevels(),

            activeLevels:
              createEmptyLevels(),

            inactiveLevels:
              createEmptyLevels(),

            total: 0,

            activeTotal: 0,

            inactiveTotal: 0,
          },
        );
      }

      const regionStats =
        regionStatsMap.get(
          regionId,
        );

      if (!regionStats) {
        continue;
      }

      const typedLevel =
        level as HSKLevel;

      /**
       * levels:
       * tổng cả active + inactive.
       */
      regionStats.levels[
        typedLevel
      ] += count;

      regionStats.total +=
        count;

      if (isActive) {
        regionStats
          .activeLevels[
          typedLevel
        ] += count;

        regionStats.activeTotal +=
          count;
      } else {
        regionStats
          .inactiveLevels[
          typedLevel
        ] += count;

        regionStats.inactiveTotal +=
          count;
      }
    }

    /**
     * Chuẩn hóa dữ liệu theo từng tỉnh.
     */
    const coverage:
      CoverageRegionItem[] =
      regions.map(
        (region) => {
          const regionId =
            String(
              region._id,
            );

          const stats =
            regionStatsMap.get(
              regionId,
            );

          /**
           * Dashboard độ phủ game
           * nên dựa vào câu hỏi đang active.
           *
           * Câu hỏi inactive không được dùng
           * để ghép trận.
           */
          const activeLevels =
            stats?.activeLevels ??
            createEmptyLevels();

          const missingLevels =
            HSK_LEVELS.filter(
              (level) =>
                activeLevels[
                  level
                ] === 0,
            );

          const insufficientLevels =
            HSK_LEVELS.filter(
              (level) =>
                activeLevels[
                  level
                ] > 0 &&
                activeLevels[
                  level
                ] <
                  MIN_QUESTIONS_PER_LEVEL,
            );

          const readyLevels =
            HSK_LEVELS.filter(
              (level) =>
                activeLevels[
                  level
                ] >=
                MIN_QUESTIONS_PER_LEVEL,
            );

          return {
            regionId,

            regionName:
              region.name ??
              "",

            chineseName:
              region.chineseName ??
              "",

            pinyin:
              region.pinyin ??
              "",

            slug:
              region.slug ??
              "",

            isActive:
              region.isActive !==
              false,

            levels:
              activeLevels,

            total:
              stats?.total ??
              0,

            activeTotal:
              stats?.activeTotal ??
              0,

            inactiveTotal:
              stats?.inactiveTotal ??
              0,

            missingLevels,

            insufficientLevels,

            readyLevels,

            isFullyReady:
              readyLevels.length ===
              HSK_LEVELS.length,
          };
        },
      );

    /**
     * Tổng quan toàn hệ thống.
     */
    const totalRegions =
      coverage.length;

    const activeRegions =
      coverage.filter(
        (item) =>
          item.isActive,
      ).length;

    const inactiveRegions =
      totalRegions -
      activeRegions;

    const fullyReadyRegions =
      coverage.filter(
        (item) =>
          item.isFullyReady,
      ).length;

    const regionsMissingQuestions =
      coverage.filter(
        (item) =>
          item.missingLevels
            .length > 0,
      ).length;

    const regionsInsufficient =
      coverage.filter(
        (item) =>
          item
            .insufficientLevels
            .length > 0,
      ).length;

    const totalQuestions =
      coverage.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.total,
        0,
      );

    const totalActiveQuestions =
      coverage.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.activeTotal,
        0,
      );

    const totalInactiveQuestions =
      coverage.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.inactiveTotal,
        0,
      );

    /**
     * Tổng câu theo HSK.
     *
     * Chỉ tính active
     * vì đó là dữ liệu game thực tế dùng.
     */
    const totalsByLevel:
      CoverageLevelMap =
      createEmptyLevels();

    for (
      const item of
      coverage
    ) {
      for (
        const level of
        HSK_LEVELS
      ) {
        totalsByLevel[
          level
        ] +=
          item.levels[
            level
          ];
      }
    }

    /**
     * Tổng số ô cần đạt chuẩn:
     *
     * số tỉnh active
     * x
     * 4 cấp độ HSK.
     */
    const totalRequiredCells =
      activeRegions *
      HSK_LEVELS.length;

    /**
     * Số ô đã đủ >= 3 câu.
     */
    const readyCells =
      coverage
        .filter(
          (item) =>
            item.isActive,
        )
        .reduce(
          (
            total,
            item,
          ) =>
            total +
            item.readyLevels
              .length,
          0,
        );

    const coveragePercent =
      totalRequiredCells >
      0
        ? Math.round(
            (readyCells /
              totalRequiredCells) *
              100,
          )
        : 0;

    return NextResponse.json(
      {
        success: true,

        data:
          coverage,

        summary: {
          minQuestionsPerLevel:
            MIN_QUESTIONS_PER_LEVEL,

          totalRegions,

          activeRegions,

          inactiveRegions,

          fullyReadyRegions,

          regionsMissingQuestions,

          regionsInsufficient,

          totalQuestions,

          totalActiveQuestions,

          totalInactiveQuestions,

          totalsByLevel,

          totalRequiredCells,

          readyCells,

          coveragePercent,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "GET /api/admin/question-coverage:",
      error,
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Không thể tải thống kê độ phủ câu hỏi.",
      },
      {
        status: 500,
      },
    );
  }
}