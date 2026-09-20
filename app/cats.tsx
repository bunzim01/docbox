"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { takePendingCatEvent, type CareKind, type CatEvent } from "@/lib/cat-events";
import {
  BOWLS,
  BOWL_H,
  BOWL_PALETTES,
  BOWL_W,
  CAT_H,
  CAT_NAMES,
  CAT_W,
  FRAMES,
  OWNER_FRAMES,
  OWNER_H,
  OWNER_NAME,
  OWNER_PALETTE,
  OWNER_W,
  PALETTES,
  type BowlKind,
  type CatKind,
  type FrameName,
  type OwnerFrame,
} from "@/lib/cat-sprites";

/**
 * 화면 맨 아래의 작은 세상 — 사용자의 실제 고양이 태리(크림색·통통)와 제리(회색 포인트·얄쌍),
 * 밥그릇·물그릇, 그리고 츄르를 주러 오는 주인 이윤.
 * 순전히 재미용이라 앱 기능을 방해하지 않는다: 빈 자리는 터치가 통과하고, 버튼보다 뒤에 깔린다.
 */

const PX = 2; // 도트 한 칸 크기
const W = CAT_W * PX;
const H = CAT_H * PX;
const OW = OWNER_W * PX;
const OH = OWNER_H * PX;
const BW = BOWL_W * PX;
const BH = BOWL_H * PX;
const TICK = 130; // ms — 일부러 뚝뚝 끊기는 도트 느낌
const FULL = 3; // 그릇이 가득 찬 정도
const STORE = "docbox-bowls";
const OWNER_SPEED = 6.5; // 이윤 걸음 (한 틱에 px) — 너무 느리면 그릇 채우기를 기다리기 답답하다

type State =
  | "walk" | "run" | "sit" | "wag" | "groom" | "stretch" | "sleep" | "jump" | "eat"
  | "stalk" // 사냥놀이: 납작 엎드려 엉덩이 씰룩
  | "pounce" // 크게 도약해 덮친다
  | "zoom"; // 우다다 — 끝에서 끝까지 전속력
type Arrive = "watch" | "food" | "water" | "churu" | "beg";

const HUNGRY = 1500; // 틱 (약 3분)
const THIRSTY = 1900; // 틱 (약 4분)

type Cat = {
  kind: CatKind;
  x: number;
  y: number;
  dir: 1 | -1;
  state: State;
  ticks: number; // 지금 상태가 끝날 때까지 남은 틱
  frame: number;
  heart: number; // 이름표·하트 표시 남은 틱
  alert: number; // 깜짝(!) 표시 남은 틱
  ask: number; // 빈 그릇 앞에서 물음표(?) 표시 남은 틱
  hunger: number;
  thirst: number;
  then?: State; // 점프가 끝난 뒤 이어질 상태
  goal?: number; // 달려갈 목적지
  faceAtGoal?: 1 | -1;
  arrive?: Arrive; // 도착해서 할 일
  eating?: Arrive; // 지금 먹고 있는 것
  hops?: number; // 제자리에서 더 뛸 횟수 (기쁠 때)
  inPlace?: boolean;
  watching?: boolean; // 올라온 파일 구경 중 (이때는 장난을 걸지 않는다)
  leap?: number; // 덮칠 때 한 틱에 나아가는 거리 (사냥감까지 닿도록 계산)
  margin?: number; // 우다다 때 벽 앞에서 돌아서는 거리 — 쫓는 애는 조금 일찍 돌아 뒤를 따라간다
};

type Task = BowlKind | "churu";

type Owner = {
  state: "away" | "walk" | "pour" | "give" | "wave" | "leave";
  x: number;
  dir: 1 | -1;
  ticks: number;
  frame: number;
  heart: number;
  task?: Task; // 지금 하러 가는(하고 있는) 일
  queue: Task[]; // 이어서 할 일
};

type World = {
  cats: Cat[];
  owner: Owner;
  bowls: Record<BowlKind, number>;
};

const JUMP_ARC = [5, 9, 11, 9, 5, 0];
const POUNCE_ARC = [7, 13, 17, 17, 13, 7, 0];
const ZOOM_SPEED = 9.5;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const isNight = () => {
  const h = new Date().getHours();
  return h >= 22 || h < 7;
};

/** 그릇(왼쪽 구석)·이윤이 츄르 주는 자리 */
function places(width: number) {
  const food = 6;
  const water = food + BW + 6;
  return { food, water, owner: Math.round(Math.min(width * 0.62, width - OW - 84)) };
}

/** 그릇 앞에 서는 자리 — 그릇이 구석에 있으니 오른쪽에 서서 왼쪽을 보고 먹는다 */
function spotAt(_cat: Cat, bowlX: number): { x: number; face: 1 | -1 } {
  return { x: bowlX - 1, face: -1 };
}

function saveBowls(bowls: World["bowls"]) {
  try {
    localStorage.setItem(STORE, JSON.stringify(bowls));
  } catch {
    // 저장이 막혀 있으면 다음에 열 때 가득 찬 상태로 시작할 뿐이다
  }
  // 홈 화면의 [밥 주기 · 물 주기] 버튼은 그릇이 비었을 때만 나타난다
  window.dispatchEvent(new CustomEvent("docbox:bowls", { detail: { ...bowls } }));
}

function goTo(cat: Cat, x: number, face: 1 | -1, arrive: Arrive, run = false) {
  cat.goal = x;
  cat.faceAtGoal = face;
  cat.arrive = arrive;
  cat.state = run ? "run" : "walk";
  cat.frame = 0;
  cat.ticks = 400;
  cat.watching = false;
  cat.y = 0;
}

function next(cat: Cat, world: World, width: number) {
  // 자다 깨면 기지개부터 켠다
  if (cat.state === "sleep") {
    cat.state = "stretch";
    cat.ticks = Math.round(rand(12, 18));
    return;
  }

  cat.frame = 0;
  cat.watching = false;
  cat.eating = undefined;

  // 배고프거나 목마르면 그릇으로 간다 (비어 있으면 포기)
  const spots = places(width);
  for (const kind of ["food", "water"] as BowlKind[]) {
    const need = kind === "food" ? cat.hunger > HUNGRY : cat.thirst > THIRSTY;
    if (!need) continue;
    const busy = world.cats.some((o) => o !== cat && (o.eating === kind || o.arrive === kind));
    if (busy) continue; // 차례를 기다렸다가 다음에 간다
    const s = spotAt(cat, spots[kind]);
    // 그릇이 비어 있으면 가서 빈 그릇을 들여다보며 기다린다
    goTo(cat, s.x, s.face, world.bowls[kind] > 0 ? kind : "beg");
    if (world.bowls[kind] === 0) {
      if (kind === "food") cat.hunger = HUNGRY - 500;
      else cat.thirst = THIRSTY - 500;
    }
    return;
  }

  const r = Math.random();
  const sleepy = isNight() ? 0.5 : 0.13;
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

/** 이윤이 그 일을 하러 서는 자리 — 그릇 오른쪽에 서서 왼쪽으로 팔을 뻗는다 */
function ownerSpot(task: Task, width: number): number {
  const spots = places(width);
  return task === "churu" ? spots.owner : spots[task] + 10;
}

/**
 * 이윤을 부른다. 이윤은 밥·물을 채우거나 츄르를 줄 때만 나온다 (알아서 들르지 않는다).
 * 이미 와 있으면 할 일 목록에 보탠다.
 */
function callOwner(world: World, width: number, task: Task) {
  const owner = world.owner;
  if (owner.task === task || owner.queue.includes(task)) return;
  if (owner.state === "away" || owner.state === "leave" || owner.state === "wave") {
    // 가까운 쪽 가장자리에서 들어온다 (그릇은 왼쪽에, 츄르 자리는 오른쪽에 가깝다)
    if (owner.state === "away") owner.x = ownerSpot(task, width) < width / 2 ? -OW - 6 : width + 6;
    owner.state = "walk";
    owner.task = task;
    owner.frame = 0;
  } else {
    owner.queue.push(task);
  }
}

/** 앱에서 일어난 일에 반응한다 */
function react(world: World, type: CatEvent, width: number) {
  const mid = width / 2;
  world.cats.forEach((cat, i) => {
    cat.y = 0;
    cat.eating = undefined;
    if (type === "upload") {
      // 뭐가 올라왔나? 가운데로 달려와 마주 보고 앉아 꼬리를 흔든다
      cat.alert = 7;
      goTo(cat, i === 0 ? mid - W - 6 : mid + 6, i === 0 ? 1 : -1, "watch", true);
    } else {
      // 보냈다! 제자리에서 폴짝폴짝 + 하트
      cat.goal = undefined;
      cat.arrive = undefined;
      cat.watching = false;
      cat.heart = 26;
      cat.hops = 2;
      jump(cat, "wag", true);
    }
  });
}

function step(world: World, width: number) {
  const max = Math.max(0, width - W);
  const spots = places(width);
  const { cats, owner } = world;

  /* ----- 이윤 ----- */
  if (owner.heart > 0) owner.heart -= 1;
  if (owner.state === "walk" && owner.task) {
    const target = ownerSpot(owner.task, width);
    if (Math.abs(owner.x - target) <= OWNER_SPEED) {
      owner.x = target;
      owner.dir = -1; // 일할 때는 왼쪽(그릇·고양이 쪽)을 본다
      if (owner.task === "churu") {
        owner.state = "give";
        owner.ticks = 75;
        // 츄르다! 둘 다 달려온다 (자고 있어도 벌떡)
        cats.forEach((cat, i) => {
          cat.alert = 8;
          cat.eating = undefined;
          goTo(cat, owner.x - W + 8 - i * 34, 1, "churu", true);
        });
      } else {
        owner.state = "pour";
        owner.ticks = 12;
      }
    } else {
      owner.dir = target > owner.x ? 1 : -1;
      owner.x += owner.dir * OWNER_SPEED;
      owner.frame += 1;
    }
  } else if (owner.state === "pour" || owner.state === "give") {
    owner.ticks -= 1;
    if (owner.ticks <= 0) {
      if (owner.state === "pour" && (owner.task === "food" || owner.task === "water")) {
        // 다 부었다 — 그릇이 가득 차고, 배고픈 애들이 달려온다
        const kind = owner.task;
        world.bowls[kind] = FULL;
        saveBowls(world.bowls);
        // 더 배고픈 애가 먼저 달려온다 (그릇 하나에 한 마리씩)
        const hungry = cats
          .filter((cat) => cat.goal === undefined && cat.state !== "eat")
          .sort((a, b) => (kind === "food" ? b.hunger - a.hunger : b.thirst - a.thirst))[0];
        const level = hungry ? (kind === "food" ? hungry.hunger : hungry.thirst) : 0;
        if (hungry && level > (kind === "food" ? HUNGRY : THIRSTY) * 0.35) {
          hungry.alert = 6;
          const s = spotAt(hungry, spots[kind]);
          goTo(hungry, s.x, s.face, kind, true);
        }
      } else {
        cats.forEach((cat) => {
          if (cat.eating === "churu") {
            cat.eating = undefined;
            cat.hunger = 0;
            cat.heart = 18;
            jump(cat, "wag", true);
          }
        });
      }
      const nextTask = owner.queue.shift();
      if (nextTask) {
        owner.task = nextTask;
        owner.state = "walk";
      } else {
        owner.task = undefined;
        owner.state = "wave";
        owner.ticks = 12;
        owner.frame = 0;
      }
    }
  } else if (owner.state === "wave") {
    owner.ticks -= 1;
    owner.frame += 1;
    if (owner.ticks <= 0) {
      owner.state = "leave";
      owner.frame = 0;
    }
  } else if (owner.state === "leave") {
    if (owner.frame === 0) owner.dir = owner.x + OW / 2 < width / 2 ? -1 : 1; // 가까운 쪽으로 나간다
    owner.x += owner.dir * OWNER_SPEED;
    owner.frame += 1;
    if (owner.x > width + 10 || owner.x < -OW - 10) owner.state = "away";
  }

  /* ----- 고양이 ----- */
  for (const cat of cats) {
    if (cat.heart > 0) cat.heart -= 1;
    if (cat.alert > 0) cat.alert -= 1;
    if (cat.ask > 0) cat.ask -= 1;
    cat.hunger += 1;
    cat.thirst += 1;

    if (cat.state === "walk" || cat.state === "run") {
      if (cat.goal !== undefined) {
        if (Math.abs(cat.x - cat.goal) <= 7) {
          // 도착
          cat.x = Math.max(0, Math.min(max, cat.goal));
          cat.dir = cat.faceAtGoal ?? cat.dir;
          cat.goal = undefined;
          cat.frame = 0;
          const what = cat.arrive;
          cat.arrive = undefined;
          if (what === "watch") {
            cat.watching = true;
            cat.state = "wag";
            cat.ticks = Math.round(rand(40, 55));
          } else if (what === "churu" && (owner.state === "give" || owner.task === "churu")) {
            cat.state = "eat";
            cat.eating = "churu";
            cat.ticks = 400; // 이윤이 일어날 때까지
          } else if (what === "beg") {
            // 빈 그릇… 밥 주세요
            cat.state = "sit";
            cat.ask = 26;
            cat.ticks = 30;
          } else if ((what === "food" || what === "water") && world.bowls[what] > 0) {
            cat.state = "eat";
            cat.eating = what;
            cat.ticks = Math.round(rand(34, 48));
          } else {
            cat.state = "sit";
            cat.ticks = 12;
          }
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
    } else if (cat.state === "pounce") {
      cat.y = POUNCE_ARC[Math.min(cat.frame, POUNCE_ARC.length - 1)];
      cat.x += cat.dir * (cat.leap ?? 8);
      cat.frame += 1;
    } else if (cat.state === "zoom") {
      // 우다다: 벽에 닿으면 그대로 돌아서 반대편으로 또 달린다
      cat.x += cat.dir * ZOOM_SPEED;
      cat.frame += 1;
      const m = cat.margin ?? 0;
      if (cat.dir === -1 && cat.x <= m) cat.dir = 1;
      else if (cat.dir === 1 && cat.x >= max - m) cat.dir = -1;
    } else if (["wag", "groom", "eat", "stalk"].includes(cat.state)) {
      cat.frame += 1;
    }

    // 화면 끝에서 돌아선다
    if (cat.x <= 0) {
      cat.x = 0;
      if (cat.goal === undefined) cat.dir = 1;
    } else if (cat.x >= max) {
      cat.x = max;
      if (cat.goal === undefined) cat.dir = -1;
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
      } else if (cat.state === "stalk") {
        // 씰룩씰룩 끝 — 사냥감 바로 앞에 떨어지도록 덮친다!
        const target = cats.find((o) => o !== cat)!;
        const gap = Math.max(0, Math.abs(target.x - cat.x) - W * 0.6);
        cat.leap = Math.min(15, Math.max(5, gap / POUNCE_ARC.length));
        cat.dir = target.x >= cat.x ? 1 : -1;
        cat.state = "pounce";
        cat.frame = 0;
        cat.ticks = POUNCE_ARC.length;
      } else if (cat.state === "pounce") {
        cat.y = 0;
        cat.frame = 0;
        const prey = cats.find((o) => o !== cat)!;
        const canPlay = prey.goal === undefined && prey.state !== "eat" && prey.state !== "pounce";
        if (canPlay && Math.abs(prey.x - cat.x) < W * 1.5) {
          // 덮쳤다! 깜짝 놀라 튀고, 그대로 우다다 추격전
          const away: 1 | -1 = prey.x >= cat.x ? 1 : -1;
          const laps = Math.round(rand(45, 75));
          prey.y = 0;
          prey.alert = 6;
          prey.dir = away;
          prey.state = "zoom";
          prey.ticks = laps;
          prey.frame = 0;
          prey.margin = 0;
          cat.dir = away;
          cat.state = "zoom";
          cat.ticks = laps + 4;
          cat.margin = 62;
        } else {
          cat.state = "sit";
          cat.ticks = 10;
        }
      } else if (cat.state === "zoom") {
        // 실컷 뛰었다 — 털썩 앉아 숨을 고른다
        cat.state = Math.random() < 0.5 ? "groom" : "sit";
        cat.ticks = Math.round(rand(24, 44));
        cat.frame = 0;
      } else if (cat.state === "eat" && (cat.eating === "food" || cat.eating === "water")) {
        // 다 먹었다 — 그릇이 한 칸 줄고, 만족해서 그루밍
        const what = cat.eating;
        world.bowls[what] = Math.max(0, world.bowls[what] - 1);
        saveBowls(world.bowls);
        if (what === "food") cat.hunger = 0;
        else cat.thirst = 0;
        cat.eating = undefined;
        cat.state = "groom";
        cat.ticks = Math.round(rand(20, 34));
        cat.frame = 0;
      } else {
        next(cat, world, width);
      }
    }
  }

  /* ----- 둘이 만났을 때 ----- */
  const [a, b] = cats;
  const dist = Math.abs(a.x - b.x);
  const awake = (c: Cat) =>
    c.goal === undefined && !c.watching && ["walk", "sit", "wag", "groom"].includes(c.state);

  if (owner.task === "churu") return; // 츄르 시간엔 장난 금지

  if (awake(a) && awake(b) && dist > W * 1.2 && dist < W * 2.6 && Math.random() < 0.012) {
    // 사냥놀이: 멀찍이서 납작 엎드려 엉덩이를 씰룩이다가 덮친다
    const [hunter, prey] = Math.random() < 0.5 ? [a, b] : [b, a];
    hunter.dir = prey.x >= hunter.x ? 1 : -1;
    hunter.state = "stalk";
    hunter.frame = 0;
    hunter.ticks = Math.round(rand(12, 20));
    // 사냥감은 그 자리에 앉아 있는다 (모르는 척)
    if (prey.state === "walk") {
      prey.state = "sit";
      prey.ticks = 40;
    }
  } else if (awake(a) && awake(b) && Math.random() < 0.0035) {
    // 갑자기 우다다! 한 마리가 달리기 시작하면 다른 애도 따라 뛴다
    const [first, second] = Math.random() < 0.5 ? [a, b] : [b, a];
    const laps = Math.round(rand(50, 85));
    first.state = "zoom";
    first.ticks = laps;
    first.frame = 0;
    first.margin = 0;
    second.margin = 62;
    second.alert = 5;
    second.dir = first.dir;
    second.state = "zoom";
    second.ticks = laps + 6;
    second.frame = 0;
  } else if (awake(a) && awake(b) && dist < W * 1.3 && Math.random() < 0.05) {
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
        other.state = "sleep"; // 옆에 누워 같이 잔다
        other.ticks = Math.round(rand(80, 180));
      } else {
        other.dir = sleeper.x >= other.x ? 1 : -1; // 툭 건드려 깨운다
        jump(other, "sit");
        sleeper.alert = 6;
        jump(sleeper, "sit");
      }
    }
  }
}

/** 같은 색 도트를 한 줄기(path)로 묶어 그릴 것을 줄인다 */
function toPaths(rows: string[], palette: Record<string, string>): [string, string][] {
  const byColor = new Map<string, string>();
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
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
    case "eat":
      return Math.floor(cat.frame / 3) % 2 === 0 ? "eatA" : "eatB";
    case "stalk":
      return Math.floor(cat.frame / 2) % 2 === 0 ? "crouchA" : "crouchB";
    case "pounce":
      return "jump";
    case "zoom":
      return cat.frame % 2 === 0 ? "walkA" : "walkB";
    default: {
      const speed = cat.state === "run" ? 1 : 2;
      return Math.floor(cat.frame / speed) % 2 === 0 ? "walkA" : "walkB";
    }
  }
}

function ownerFrame(owner: Owner): OwnerFrame {
  if (owner.state === "give" || owner.state === "pour") return "give";
  if (owner.state === "wave") return Math.floor(owner.frame / 3) % 2 === 0 ? "wave" : "stand";
  return Math.floor(owner.frame / 2) % 2 === 0 ? "walkA" : "walkB";
}

function Sprite({
  paths,
  w,
  h,
  width,
  height,
  flip,
}: {
  paths: [string, string][];
  w: number;
  h: number;
  width: number;
  height: number;
  flip?: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={width}
      height={height}
      shapeRendering="crispEdges"
      style={{ transform: flip ? "scaleX(-1)" : undefined, display: "block" }}
    >
      {paths.map(([color, d]) => (
        <path key={color} d={d} fill={color} />
      ))}
    </svg>
  );
}

export default function Cats({ hidden }: { hidden?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<World | null>(null);
  const stillRef = useRef(false);
  const [, setVersion] = useState(0);
  const redraw = () => setVersion((v) => v + 1);

  const art = useMemo(() => {
    const cats = {} as Record<CatKind, Record<string, [string, string][]>>;
    for (const kind of ["taeri", "jeri"] as CatKind[]) {
      cats[kind] = {};
      // 고양이마다 그림이 다르다 (태리는 둥글고 통통, 제리는 갸름하고 날씬)
      for (const [name, rows] of Object.entries(FRAMES[kind])) cats[kind][name] = toPaths(rows, PALETTES[kind]);
    }
    const bowls = {} as Record<BowlKind, [string, string][][]>;
    for (const kind of ["food", "water"] as BowlKind[]) {
      bowls[kind] = BOWLS[kind].map((rows) => toPaths(rows, BOWL_PALETTES[kind]));
    }
    const owner = {} as Record<string, [string, string][]>;
    for (const [name, rows] of Object.entries(OWNER_FRAMES)) owner[name] = toPaths(rows, OWNER_PALETTE);
    // 손에 든 것만 색을 바꾼다: 사료 봉지(갈색) · 물병(하늘색)
    const pour = {
      food: toPaths(OWNER_FRAMES.give, { ...OWNER_PALETTE, C: "#8a5a2b", c: "#c9925a" }),
      water: toPaths(OWNER_FRAMES.give, { ...OWNER_PALETTE, C: "#6f9cc4", c: "#bfe3fb" }),
    };
    return { cats, bowls, owner, pour };
  }, []);

  useEffect(() => {
    const width = boxRef.current?.clientWidth ?? 360;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    stillRef.current = still;

    let bowls: World["bowls"] = { food: FULL, water: FULL };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (saved && typeof saved.food === "number" && typeof saved.water === "number") {
        bowls = {
          food: Math.max(0, Math.min(FULL, saved.food)),
          water: Math.max(0, Math.min(FULL, saved.water)),
        };
      }
    } catch {
      // 저장된 값이 없거나 읽을 수 없으면 가득 찬 그릇으로 시작
    }

    const cat = (kind: CatKind, x: number, dir: 1 | -1, state: State, ticks: number): Cat => ({
      kind, x, y: 0, dir, state, ticks, frame: 0, heart: 0, alert: 0, ask: 0,
      hunger: Math.round(rand(HUNGRY - 900, HUNGRY - 300)),
      thirst: Math.round(rand(THIRSTY - 1400, THIRSTY - 500)),
    });
    worldRef.current = {
      cats: [
        cat("taeri", width * 0.12, 1, still ? "sit" : "walk", 40),
        cat("jeri", width * 0.68, -1, still ? "sleep" : "sit", 25),
      ],
      owner: { state: "away", x: width + 6, dir: -1, ticks: 0, frame: 0, heart: 0, queue: [] },
      bowls,
    };
    window.dispatchEvent(new CustomEvent("docbox:bowls", { detail: { ...bowls } }));
    // 개발할 때만: 장면을 강제로 재생해 볼 수 있게 열어 둔다 (운영에는 포함되지 않는다)
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __catWorld?: World }).__catWorld = worldRef.current;
    }
    redraw();

    // 움직임을 줄여 달라고 설정한 기기에서는 가만히 있는다
    if (still) return;

    // 앱에서 일어난 일(올리기·보내기)에 반응
    const onNews = (e: Event) => {
      const type = (e as CustomEvent<CatEvent>).detail;
      if (worldRef.current) react(worldRef.current, type, boxRef.current?.clientWidth ?? 360);
    };
    window.addEventListener("docbox:cat", onNews);

    // 홈 화면의 [밥 주기 · 물 주기 · 츄르 주기] 버튼
    const onCare = (e: Event) => {
      const kind = (e as CustomEvent<CareKind>).detail;
      const w = worldRef.current;
      if (!w) return;
      if (kind !== "churu" && w.bowls[kind] > 0) return; // 아직 남아 있으면 안 채운다
      callOwner(w, boxRef.current?.clientWidth ?? 360, kind);
      redraw();
    };
    window.addEventListener("docbox:care", onCare);
    const pendingNews = takePendingCatEvent();
    if (pendingNews) react(worldRef.current, pendingNews, width);

    const timer = setInterval(() => {
      if (document.hidden || !worldRef.current) return;
      step(worldRef.current, boxRef.current?.clientWidth ?? 360);
      redraw();
    }, TICK);
    return () => {
      clearInterval(timer);
      window.removeEventListener("docbox:cat", onNews);
      window.removeEventListener("docbox:care", onCare);
    };
  }, []);

  if (hidden) return null;
  const world = worldRef.current;
  const width = boxRef.current?.clientWidth ?? 360;
  const spots = places(width);

  /** 그릇을 누르면 이윤이 와서 채워준다 (움직임을 줄인 기기에서는 바로 채워진다) */
  function refill(kind: BowlKind) {
    if (!world) return;
    if (stillRef.current) {
      world.bowls[kind] = FULL;
      saveBowls(world.bowls);
    } else if (world.bowls[kind] === 0) {
      callOwner(world, width, kind); // 비었을 때만 채워준다
    }
    redraw();
  }

  return (
    <div
      ref={boxRef}
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 mx-auto w-full max-w-4xl"
      style={{ height: OH + 22 }}
    >
      {world && (
        <>
          {/* 이윤 — 오른쪽에서 걸어 들어와 왼쪽을 보고 츄르를 내민다 */}
          {world.owner.state !== "away" && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                world.owner.heart = 14;
                redraw();
              }}
              className="pointer-events-auto absolute bottom-0 cursor-pointer select-none bg-transparent p-0"
              style={{ left: world.owner.x, width: OW, height: OH }}
            >
              <Sprite
                paths={
                  world.owner.state === "pour" && world.owner.task && world.owner.task !== "churu"
                    ? art.pour[world.owner.task]
                    : art.owner[ownerFrame(world.owner)]
                }
                w={OWNER_W}
                h={OWNER_H}
                width={OW}
                height={OH}
                flip={world.owner.dir === -1}
              />
              {world.owner.heart > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-base font-bold text-ink">
                  {OWNER_NAME} <span className="text-red-500">♥</span>
                </span>
              )}
            </button>
          )}

          {world.cats.map((cat) => (
            <button
              key={cat.kind}
              type="button"
              tabIndex={-1}
              onClick={() => {
                // 쓰다듬으면 이름표 + 하트, 깜짝 놀라 폴짝
                cat.heart = 12;
                if (stillRef.current) {
                  if (cat.state === "sleep") cat.state = "sit";
                  setTimeout(() => {
                    cat.heart = 0;
                    redraw();
                  }, 1500);
                } else if (!["jump", "eat", "stalk", "pounce", "zoom"].includes(cat.state)) {
                  jump(cat, "sit");
                }
                redraw();
              }}
              className="pointer-events-auto absolute cursor-pointer select-none bg-transparent p-0"
              style={{ left: cat.x, bottom: cat.y, width: W, height: H }}
            >
              <Sprite
                paths={art.cats[cat.kind][frameOf(cat)]}
                w={CAT_W}
                h={CAT_H}
                width={W}
                height={H}
                flip={cat.dir === -1}
              />
              {cat.state === "sleep" && (
                <span className="cat-zzz absolute -top-3 right-1 text-xs font-bold text-zinc-400">z</span>
              )}
              {cat.ask > 0 && cat.alert === 0 && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base font-black text-zinc-500">?</span>
              )}
              {cat.alert > 0 && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-base font-black text-gold">!</span>
              )}
              {cat.heart > 0 && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-base font-bold text-ink">
                  {CAT_NAMES[cat.kind]} <span className="text-red-500">♥</span>
                </span>
              )}
            </button>
          ))}

          {/* 밥그릇·물그릇 — 고양이 앞에 놓인다. 누르면 가득 채워진다 */}
          {(["food", "water"] as BowlKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              tabIndex={-1}
              onClick={() => refill(kind)}
              className="pointer-events-auto absolute bottom-0 cursor-pointer select-none bg-transparent p-0"
              style={{ left: spots[kind], width: BW, height: BH + 8, paddingTop: 8 }}
            >
              <Sprite paths={art.bowls[kind][world.bowls[kind]]} w={BOWL_W} h={BOWL_H} width={BW} height={BH} />
            </button>
          ))}

        </>
      )}
    </div>
  );
}
