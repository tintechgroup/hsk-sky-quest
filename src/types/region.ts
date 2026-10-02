/*
 * Dữ liệu tỉnh/thành được sử dụng
 * bên trong giao diện trò chơi.
 */
export interface Region {
  id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;

  geography: string;
  culture: string;
  landmark: string;

  /*
   * Vị trí hiển thị trên bản đồ.
   * Giá trị từ 0 đến 100, tương ứng %.
   */
  mapX: number;
  mapY: number;

  /*
   * Thứ tự máy bay đi qua các tỉnh.
   */
  flightOrder: number;

  color: string;
  isActive: boolean;
}

/*
 * Dữ liệu tỉnh/thành trả về trực tiếp
 * từ MongoDB và API.
 */
export interface RegionApiItem {
  _id: string;
  name: string;
  chineseName: string;
  pinyin: string;
  slug: string;

  geography: string;
  culture: string;
  landmark: string;

  mapX: number;
  mapY: number;
  flightOrder: number;

  color: string;
  isActive: boolean;

  createdAt?: string;
  updatedAt?: string;
}

/*
 * Cấu trúc phản hồi từ API tỉnh/thành.
 */
export interface RegionsApiResponse {
  success: boolean;
  message?: string;
  data?: RegionApiItem[];
  total?: number;
}

/*
 * Chuyển dữ liệu MongoDB thành dữ liệu
 * mà các component trò chơi sử dụng.
 */
export function mapApiRegionToRegion(
  item: RegionApiItem,
): Region {
  return {
    id: item._id,
    name: item.name,
    chineseName: item.chineseName,
    pinyin: item.pinyin,
    slug: item.slug,

    geography: item.geography,
    culture: item.culture,
    landmark: item.landmark,

    mapX: Number(item.mapX),
    mapY: Number(item.mapY),

    flightOrder: Number(item.flightOrder),

    color: item.color || "#34d399",
    isActive: item.isActive,
  };
}