import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TSRM 공사운영현황 PoC",
  description: "공사관리담당자를 위한 공사운영현황 Dashboard PoC",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
