import {
  mapApiRegionToRegion,
} from "@/types/region";

import type {
  Region,
  RegionsApiResponse,
} from "@/types/region";

/*
 * Lấy danh sách tỉnh đang hoạt động
 * từ MongoDB thông qua API.
 */
export async function getActiveRegions(): Promise<
  Region[]
> {
  const response = await fetch("/api/regions", {
    method: "GET",
    cache: "no-store",
  });

  const result =
    (await response.json()) as RegionsApiResponse;

  if (!response.ok || !result.success) {
    throw new Error(
      result.message ||
        "Không thể tải danh sách tỉnh/thành.",
    );
  }

  return (result.data ?? [])
    .filter((item) => item.isActive)
    .map(mapApiRegionToRegion)
    .sort(
      (first, second) =>
        first.flightOrder -
        second.flightOrder,
    );
}