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
      "HSK Sky Quest - Trò chơi học tiếng Trung",
    template:
      "%s | HSK Sky Quest",
  },

  description:
    "HSK Sky Quest là trò chơi học tiếng Trung, luyện câu hỏi HSK, ghép trận với người chơi khác và theo dõi lịch sử thi đấu.",

  applicationName: "HSK Sky Quest",

  authors: [
    {
      name: "HSK Sky Quest",
    },
  ],

  creator: "HSK Sky Quest",
  publisher: "HSK Sky Quest",

  keywords: [
    "HSK",
    "học tiếng Trung",
    "luyện thi HSK",
    "trò chơi HSK",
    "HSK Sky Quest",
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
    siteName: "HSK Sky Quest",
    title:
      "HSK Sky Quest - Trò chơi học tiếng Trung",
    description:
      "Luyện câu hỏi HSK, tham gia ghép trận và theo dõi lịch sử thi đấu.",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "HSK Sky Quest - Trò chơi học tiếng Trung",
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