import type { MetadataRoute } from "next";

/** 폰 홈 화면에 추가했을 때 앱처럼 보이게 하는 설정 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "라이크웨이 자료실",
    short_name: "자료실", // 아이콘 밑 이름 — 길면 잘린다
    description: "제안서를 모아두고 카톡으로 바로 보내기",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone", // 주소창 없이 전체 화면
    orientation: "portrait",
    background_color: "#faf6ee",
    theme_color: "#faf6ee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
