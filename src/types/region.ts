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

  // Nội dung bong bóng chat trong mục Khám phá Trung Quốc.
  exploreInfo?: string;

  // Các câu hỏi trắc nghiệm của tỉnh.
  exploreQuestions?: ExploreQuestion[];

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
 * Một câu hỏi trắc nghiệm của tỉnh.
 * correctIndex: 0 = A, 1 = B, 2 = C, 3 = D.
 */
export interface ExploreQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

/*
 * Dữ liệu tỉnh/thành trả về
 * trực tiếp từ MongoDB và API.
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

  exploreInfo?: string;
  exploreQuestions?: ExploreQuestion[];

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

    exploreInfo: item.exploreInfo || "",
    exploreQuestions: item.exploreQuestions || [],

    mapX: Number(item.mapX),
    mapY: Number(item.mapY),

    flightOrder: Number(item.flightOrder),

    color: item.color || "#34d399",
    isActive: item.isActive,
  };
}