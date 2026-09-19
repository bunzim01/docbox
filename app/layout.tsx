import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "문서함",
  description: "제안서를 모아두고 카톡으로 바로 보내기",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 카카오 키가 있을 때만 SDK 를 불러온다 (PC 에서 링크 카드 보내기용)
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <html lang="ko" className="h-full">
      <body className="flex min-h-full flex-col bg-white text-zinc-900 antialiased">
        {children}
        {kakaoKey && (
          <Script
            src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
            integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
            crossOrigin="anonymous"
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  );
}
