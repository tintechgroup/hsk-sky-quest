import type { Region } from "@/types/game";

export const regions: Region[] = [
  {
    id: "beijing",
    name: "Bắc Kinh",
    chineseName: "北京",
    pinyin: "Běijīng",
    geography:
      "Nằm ở phía bắc Trung Quốc, gần rìa phía bắc đồng bằng Hoa Bắc.",
    culture:
      "Nổi tiếng với Kinh kịch, những khu phố hutong và nhiều công trình lịch sử.",
    landmark: "Tử Cấm Thành",
  },
  {
    id: "xian",
    name: "Tây An",
    chineseName: "西安",
    pinyin: "Xī’ān",
    geography:
      "Thuộc tỉnh Thiểm Tây, nằm trong khu vực đồng bằng Quan Trung.",
    culture:
      "Là cố đô của nhiều triều đại, gắn với lịch sử Con đường Tơ lụa.",
    landmark: "Đội quân đất nung",
  },
  {
    id: "chengdu",
    name: "Thành Đô",
    chineseName: "成都",
    pinyin: "Chéngdū",
    geography:
      "Là thủ phủ tỉnh Tứ Xuyên, nằm trên đồng bằng Thành Đô.",
    culture:
      "Nổi tiếng với văn hóa trà quán và ẩm thực Tứ Xuyên có vị cay tê.",
    landmark: "Cơ sở nghiên cứu và bảo tồn gấu trúc lớn",
  },
  {
    id: "guilin",
    name: "Quế Lâm",
    chineseName: "桂林",
    pinyin: "Guìlín",
    geography:
      "Thuộc Quảng Tây, nổi bật với địa hình núi đá vôi và dòng Li Giang.",
    culture:
      "Phong cảnh non nước xuất hiện nhiều trong hội họa và thơ ca Trung Hoa.",
    landmark: "Sông Li Giang",
  },
];