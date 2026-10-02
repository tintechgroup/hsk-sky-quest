import type {
  Metadata,
} from "next";

export const metadata: Metadata = {
  title: "Đăng ký tài khoản",

  description:
    "Tạo tài khoản HSK Sky Quest để tham gia ghép trận, lưu thành tích và xem lịch sử thi đấu.",

  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}