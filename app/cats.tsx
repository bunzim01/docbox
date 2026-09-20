"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { takePendingCatEvent, type CatEvent } from "@/lib/cat-events";
import { CAT_H, CAT_W, FRAMES, PALETTES, type CatKind, type FrameName } from "@/lib/cat-sprites";

/**
 * 화면 맨 아래를 돌아다니는 픽셀 고양이 두 마리 (치즈 먼치킨 · 샴 먼치킨).
 * 순전히 재미용 — 버튼보다 뒤에 깔리고, 눌러도 다른 동작을 방해하지 않는다.
 */

const PX = 3; // 도트 한 칸 크기
const W = CAT_W * PX;
const H = CAT_H * PX;
const TICK = 130; // ms — 일부러 뚝뚝 끊기는 도트 느낌

type State = "walk" | "run" | "sit" | "wag" | "groom" | "stretch" | "sleep" | "jump";
type Cat = {
  kind: CatKind;
  x: number;
  y: number;
  dir: 1 | -1;
  state: State;
  ticks: number; // 지금 상태가 끝날 때까지 남은 틱
  frame: number;
  heart: number; // 하트 표시 남은 틱
  alert: number; // 깜짝(!) 표시 남은 틱
  then?: State; // 점프가 끝난 뒤 이어질 상태
  goal?: number; // 달려갈 목적지 (도착하면 앉아서 구경)
  faceAtGoal?: 1 | -1;
  hops?: number; // 제자리에서 더 뛸 횟수 (기쁠 때)
  inPlace?: boolean; // 제자리 점프
  watching?: boolean; // 올라온 파일 구경 중 (이때는 장난을 걸지 않는다)
};

const JUMP_ARC = [5, 9, 11, 9, 5, 0];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const isNight = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 7;
};

function next(cat: Cat) {
  // 자다 깨면 기지개부터 켠다
  if (cat.state === "sleep") {
    cat.state = "stretch";
    cat.ticks = Math.round(rand(12, 18));
    return;
  }

  const r = Math.random();
  const sleepy = isNight() ? 0.5 : 0.13;
  cat.frame = 0;
  cat.watching = false;
  if (r < sleepy) {
    cat.state = "sleep";
    cat.ticks = Math.round(rand(90, 220));
  } else if (r < sleepy + 0.1) {
    cat.state = "sit";
    cat.ticks = Math.round(rand(12, 30));
  } else if (r < sleepy + 0.22) {
    cat.state = "wag";
    cat.ticks = Math.round(rand(16, 36));
  } else if (r < sleepy + 0.36) {
    cat.state = "groom";
    cat.ticks = Math.round(rand(24, 50));
  } else if (r < sleepy + 0.42) {
    cat.state = "stretch";
    cat.ticks = Math.round(rand(10, 16));
  } else {
    cat.state = "walk";
    cat.ticks = Math.round(rand(20, 70));
    if (Math.random() < 0.4) cat.dir = cat.dir === 1 ? -1 : 1;
  }
}

function jump(cat: Cat, then: State = "sit", inPlace = false) {
  cat.state = "jump";
  cat.frame = 0;
  cat.ticks = JUMP_ARC.length;
  cat.then = then;
  cat.inPlace = inPlace;
}

/** 앱에서 일어난 일에 반응한다 */
function react(cats: Cat[], type: CatEvent, width: number) {
  const mid = width / 2;
  cats.forEach((cat, i) => {
    cat.y = 0;
    if (type === "upload") {
      // 뭐가 올라왔나? 가운데로 달려와 마주 보고 앉아 꼬리를 흔든다
      cat.alert = 7;
      cat.goal = i === 0 ? mid - W - 6 : mid + 6;
      cat.faceAtGoal = i === 0 ? 1 : -1;
      cat.state = "run";
      cat.frame = 0;
      cat.ticks = 200;
    } else {
      // 보냈다! 제자리에서 폴짝폴짝 + 하트
      cat.goal = undefined;
      cat.watching = false;
      cat.heart = 26;
      cat.hops = 2;
      jump(cat, "wag", true);
    }
  });
}

function step(cats: Cat[], width: number) {
  const max = Math.max(0, width - W);

  for (const cat of cats) {
    if (cat.heart > 0) cat.heart -= 1;
    if (cat.alert > 0) cat.alert -= 1;

    if (cat.state === "walk" || cat.state === "run") {
      if (cat.goal !== undefined) {
        // 목적지가 있으면 그쪽으로 달려가고, 도착하면 앉아서 구경한다
        if (Math.abs(cat.x - cat.goal) <= 7) {
          cat.x = cat.goal;
          cat.dir = cat.faceAtGoal ?? cat.dir;
          cat.goal = undefined;
          cat.watching = true;
          cat.state = "wag";
          cat.ticks = Math.round(rand(40, 55));
          cat.frame = 0;
          continue;
        }
        cat.dir = cat.goal > cat.x ? 1 : -1;
      }
      cat.x += cat.dir * (cat.state === "run" ? 6 : 2.4);
      cat.frame += 1;
    } else if (cat.state === "jump") {
      cat.y = JUMP_ARC[Math.min(cat.frame, JUMP_ARC.length - 1)];
      if (!cat.inPlace) cat.x += cat.dir * 3.5;
      cat.frame += 1;
    } else if (cat.state === "wag" || cat.state === "groom") {
      cat.frame += 1;
    }

    // 화면 끝에서 돌아선다
    if (cat.x <= 0) {
      cat.x = 0;
      cat.dir = 1;
    } else if (cat.x >= max) {
      cat.x = max;
      cat.dir = -1;
    }

    cat.ticks -= 1;
    if (cat.ticks <= 0) {
      if (cat.state === "jump" && (cat.hops ?? 0) > 0) {
        cat.hops = (cat.hops ?? 0) - 1;
        cat.y = 0;
        jump(cat, cat.then ?? "wag", true);
      } else if (cat.state === "jump") {
        cat.y = 0;
        cat.inPlace = false;
        cat.state = cat.then ?? "sit";
        cat.ticks = cat.state === "run" ? Math.round(rand(14, 26)) : Math.round(rand(8, 20));
        cat.frame = 0;
        cat.then = undefined;
      } else {
        next(cat);
      }
    }
  }

  // 둘이 만났을 때
  const [a, b] = cats;
  const dist = Math.abs(a.x - b.x);
  const awake = (c: Cat) =>
    c.goal === undefined && !c.watching && ["walk", "sit", "wag", "groom"].includes(c.state);

  if (awake(a) && awake(b) && dist < W * 1.3 && Math.random() < 0.05) {
    // 장난: 한 마리가 덮치고, 다른 한 마리는 놀라 도망 → 쫓아간다
    const [hunter, prey] = Math.random() < 0.5 ? [a, b] : [b, a];
    const away: 1 | -1 = prey.x >= hunter.x ? 1 : -1;
    hunter.dir = away;
    jump(hunter, "run");
    prey.dir = away;
    prey.alert = 5;
    jump(prey, "run");
  } else if (dist < W * 1.1 && Math.random() < 0.03) {
    const sleeper = a.state === "sleep" ? a : b.state === "sleep" ? b : null;
    const other = sleeper === a ? b : a;
    if (sleeper && awake(other)) {
      if (Math.random() < 0.65) {
        // 옆에 누워 같이 잔다
        other.state = "sleep";
        other.ticks = Math.round(rand(80, 180));
      } else {
        // 툭 건드려 깨운다
        other.dir = sleeper.x >= other.x ? 1 : -1;
        jump(other, "sit");
        sleeper.alert = 6;
        jump(sleeper, "sit");
      }
    }
  }
}

/** 같은 색 도트를 한 줄기(path)로 묶어 그릴 것을 줄인다 */
function spritePaths(kind: CatKind, rows: string[]) {
  const byColor = new Map<string, string>();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = PALETTES[kind][ch];
      if (!color) return;
      byColor.set(color, `${byColor.get(color) ?? ""}M${x} ${y}h1v1h-1z`);
    });
  });
  return [...byColor.entries()];
}

function frameOf(cat: Cat): FrameName {
  switch (cat.state) {
    case "sleep":
      return "sleep";
    case "sit":
      return "sit";
    case "stretch":
      return "stretch";
    case "jump":
      return "jump";
    case "wag":
      return Math.floor(cat.frame / 2) % 2 === 0 ? "sit" : "sitWag";
    case "groom":
      return Math.floor(cat.frame / 3) % 2 === 0 ? "groomA" : "groomB";
    default: {
      const speed = cat.state === "run" ? 1 : 2;
      return Math.floor(cat.frame / speed) % 2 === 0 ? "walkA" : "walkB";
    }
  }
}

export default function Cats({ hidden }: { hidden?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const catsRef = useRef<Cat[] | null>(null);
  const stillRef = useRef(false);
  const [, setVersion] = useState(0);

  const sprites = useMemo(() => {
    const out = {} as Record<CatKind, Record<string, [string, string][]>>;
    for (const kind of ["cheese", "siamese"] as CatKind[]) {
      out[kind] = {};
      for (const [name, rows] of Object.entries(FRAMES)) out[kind][name] = spritePaths(kind, rows);
    }
    return out;
  }, []);

  useEffect(() => {
    const width = boxRef.current?.clientWidth ?? 360;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stillRef.current = still;

    catsRef.current = [
      { kind: "cheese", x: width * 0.22, y: 0, dir: 1, state: still ? "sit" : "walk", ticks: 40, frame: 0, heart: 0, alert: 0 },
      { kind: "siamese", x: width * 0.62, y: 0, dir: -1, state: still ? "sleep" : "sit", ticks: 25, frame: 0, heart: 0, alert: 0 },
    ];
    setVersion((v) => v + 1);

    // 움직임을 줄여 달라고 설정한 기기에서는 가만히 있는다
    if (still) return;

    // 앱에서 일어난 일(올리기·보내기)에 반응
    const onNews = (e: Event) => {
      const type = (e as CustomEvent<CatEvent>).detail;
      if (catsRef.current) react(catsRef.current, type, boxRef.current?.clientWidth ?? 360);
    };
    window.addEventListener("docbox:cat", onNews);
    const pendingNews = takePendingCatEvent();
    if (pendingNews) react(catsRef.current, pendingNews, width);

    const timer = setInterval(() => {
      if (document.hidden || !catsRef.current) return;
      step(catsRef.current, boxRef.current?.clientWidth ?? 360);
      setVersion((v) => v + 1);
    }, TICK);
    return () => {
      clearInterval(timer);
      window.removeEventListener("docbox:cat", onNews);
    };
  }, []);

  if (hidden) return null;
  const cats = catsRef.current ?? [];

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-4xl"
      style={{ height: H + 22 }}
    >
      {cats.map((cat) => (
        <button
          key={cat.kind}
          type="button"
          tabIndex={-1}
          onClick={() => {
            // 쓰다듬으면 깜짝 놀라 폴짝 + 하트
            cat.heart = 12;
            if (stillRef.current) {
              // 움직임을 줄인 기기: 폴짝 뛰지 않고 하트만 잠깐 보여준다
              if (cat.state === "sleep") cat.state = "sit";
              setTimeout(() => {
                cat.heart = 0;
                setVersion((v) => v + 1);
              }, 1500);
            } else if (cat.state !== "jump") {
              jump(cat, "sit");
            }
            setVersion((v) => v + 1);
          }}
          className="pointer-events-auto absolute cursor-pointer select-none bg-transparent p-0"
          style={{ left: cat.x, bottom: cat.y, width: W, height: H }}
        >
          <svg
            viewBox={`0 0 ${CAT_W} ${CAT_H}`}
            width={W}
            height={H}
            shapeRendering="crispEdges"
            style={{ transform: cat.dir === -1 ? "scaleX(-1)" : undefined, display: "block" }}
          >
            {sprites[cat.kind][frameOf(cat)].map(([color, d]) => (
              <path key={color} d={d} fill={color} />
            ))}
          </svg>

          {cat.state === "sleep" && (
            <span className="cat-zzz absolute -top-3 right-1 text-xs font-bold text-zinc-400">z</span>
          )}
          {cat.alert > 0 && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base font-black text-gold">!</span>
          )}
          {cat.heart > 0 && (
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base text-red-500">♥</span>
          )}
        </button>
      ))}
    </div>
  );
}
