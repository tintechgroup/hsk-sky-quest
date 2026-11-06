import type {
  Metadata,
  Viewport,
} from "next";

import { Roboto } from "next/font/google";

import "./globals.css";

const roboto = Roboto({
  subsets: [
    "latin",
    "vietnamese",
  ],
  weight: [
    "300",
    "400",
    "500",
    "600",
    "700",
    "800",
    "900",
  ],
  style: [
    "normal",
    "italic",
  ],
  display: "swap",
  variable: "--font-roboto",
  fallback: [
    "Arial",
    "Helvetica",
    "sans-serif",
  ],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default:
      "学霸，你好！ - Trò chơi học tiếng Trung",
    template:
      "%s | 学霸，你好！",
  },

  description:
    "学霸，你好！ là trò chơi học tiếng Trung, luyện câu hỏi HSK, ghép trận với người chơi khác và theo dõi lịch sử thi đấu.",

  applicationName: "学霸，你好！",

  authors: [
    {
      name: "学霸，你好！",
    },
  ],

  creator: "学霸，你好！",
  publisher: "学霸，你好！",

  keywords: [
    "HSK",
    "học tiếng Trung",
    "luyện thi HSK",
    "trò chơi HSK",
    "学霸，你好！",
    "thi đấu tiếng Trung",
    "câu hỏi tiếng Trung",
    "học tiếng Trung online",
  ],

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "/",
    siteName: "学霸，你好！",
    title:
      "学霸，你好！ - Trò chơi học tiếng Trung",
    description:
      "Luyện câu hỏi HSK, tham gia ghép trận và theo dõi lịch sử thi đấu.",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "学霸，你好！ - Trò chơi học tiếng Trung",
    description:
      "Luyện câu hỏi HSK, tham gia ghép trận và theo dõi lịch sử thi đấu.",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  category: "education",

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#071f31",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={roboto.variable}
    >
      <body className="min-h-screen bg-[#061b2b] antialiased">
        {children}
      </body>
    </html>
  );
}