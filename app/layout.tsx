import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "라이크웨이 자료실",
  description: "제안서를 모아두고 카톡으로 바로 보내기",
  applicationName: "자료실",
  // 아이폰 홈 화면에 추가했을 때: 아이콘 밑 이름 + 주소창 없는 전체 화면
  appleWebApp: { capable: true, title: "자료실", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // 카카오 키가 있을 때만 SDK 를 불러온다 (PC 에서 링크 카드 보내기용)
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  return (
    <html lang="ko" className="h-full">
      <head>
        {/* office.likeway.co.kr 과 같은 글꼴 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col bg-cream text-ink antialiased">
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
