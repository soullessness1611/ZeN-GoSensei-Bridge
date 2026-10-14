#!/usr/bin/env node
// ZeN KataGo Bridge 0.1.0 — https://zen-gosensei.vercel.app/guide#integrate
// ต้องใช้ Node.js 20 ขึ้นไป · ไม่มีไลบรารีภายนอก
// Copyright (c) 2026 Patiwat Nakara (SouLLeSSNesS) · Source-available — see LICENSE (read/run with ZeN-GoSensei only; no copying, modification or redistribution)
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// tools/katago-bridge/bridge.ts
import http from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// apps/web/app/api/analyze/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic,
  runtime: () => runtime
});

// apps/web/lib/katago.ts
import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";

// packages/go-train/src/enginepick.ts
var enginepick_exports = {};
__export(enginepick_exports, {
  pickMove: () => pickMove,
  valueFor: () => valueFor
});
function valueFor(m, toPlayIsBlack) {
  return toPlayIsBlack ? m.scoreLead : -m.scoreLead;
}
function pickMove(infos, toPlayIsBlack, maxLoss, rand = Math.random, minVisits = 2) {
  if (!infos.length) return null;
  const solid = infos.filter((m) => m.visits >= minVisits);
  const usable = solid.length ? solid : infos;
  const best = usable.reduce((a, b) => valueFor(b, toPlayIsBlack) > valueFor(a, toPlayIsBlack) ? b : a);
  const bestValue = valueFor(best, toPlayIsBlack);
  const pool = usable.filter((m) => bestValue - valueFor(m, toPlayIsBlack) <= maxLoss);
  const chosen = pool.length > 1 ? pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))] : best;
  return {
    move: chosen,
    best,
    loss: Math.max(0, Math.round((bestValue - valueFor(chosen, toPlayIsBlack)) * 100) / 100),
    pool: pool.length
  };
}

// packages/go-train/src/rankest.ts
var rankest_exports = {};
__export(rankest_exports, {
  MEASURED_ERROR: () => MEASURED_ERROR,
  ODD_GAP: () => ODD_GAP,
  RANKS: () => RANKS,
  RECENT_GAMES: () => RECENT_GAMES,
  addMove: () => addMove,
  aggregate: () => aggregate,
  combine: () => combine,
  emptyLL: () => emptyLL,
  findOdd: () => findOdd,
  kyuOf: () => kyuOf,
  pushHistory: () => pushHistory,
  rankIndex: () => rankIndex,
  rankLabel: () => rankLabel,
  summarize: () => summarize
});
var RANKS = [...Array(20)].map((_, i) => 20 - i + "k").concat([...Array(9)].map((_, i) => i + 1 + "d"));
var MEASURED_ERROR = { 9: 3.4, 19: 2.3 };
var FLOOR_P = 1e-6;
function emptyLL() {
  return RANKS.map(() => 0);
}
function addMove(ll, probs) {
  for (let r = 0; r < RANKS.length; r++) ll[r] += Math.log(Math.max(FLOOR_P, probs[r] ?? 0));
}
function combine(list) {
  const out = emptyLL();
  for (const ll of list) for (let r = 0; r < RANKS.length; r++) out[r] += ll[r] ?? 0;
  return out;
}
function summarize(ll) {
  const mx = Math.max(...ll);
  const w = ll.map((v) => Math.exp(v - mx));
  const sw = w.reduce((a, b) => a + b, 0);
  const mean = w.reduce((a, v, i) => a + v * i, 0) / sw;
  const sd = Math.sqrt(w.reduce((a, v, i) => a + v * (i - mean) ** 2, 0) / sw);
  const best = ll.indexOf(mx);
  return { best, mean, sd, floor: best === 0 || mean < 1 };
}
function rankLabel(x) {
  const r = Math.round(x);
  return r >= 20 ? r - 19 + " ดั้ง" : 20 - r + " คิว";
}
function kyuOf(x) {
  return 20 - Math.round(x);
}
function rankIndex(s) {
  const m = /^(\d+)\s*([kd])$/i.exec(String(s || "").trim());
  if (!m) return null;
  const n = Number(m[1]);
  return m[2].toLowerCase() === "d" ? 19 + Math.min(9, n) : 20 - n;
}
var ODD_GAP = 5;
function findOdd(turns, ref, max = 3) {
  const rank = Math.max(0, Math.min(RANKS.length - 1, Math.round(ref) + ODD_GAP));
  return turns.filter((d) => d.top[rank] !== d.played && (d.p[rank] ?? 0) < 0.05 && (d.topP[rank] ?? 0) >= 0.3).map((d) => ({ turn: d.t, played: d.played, suggest: d.top[rank], rank, pPlayed: d.p[rank], pSuggest: d.topP[rank] })).sort((a, b) => b.pSuggest / Math.max(b.pPlayed, 1e-3) - a.pSuggest / Math.max(a.pPlayed, 1e-3)).slice(0, max);
}
var RECENT_GAMES = 8;
function aggregate(games, ids, at) {
  const use = ids.filter((id) => games[id]).slice(-RECENT_GAMES);
  if (!use.length) return null;
  const s = summarize(combine(use.map((id) => games[id].ll)));
  return {
    at,
    mean: s.mean,
    sd: s.sd,
    floor: s.floor,
    games: use.length,
    moves: use.reduce((a, id) => a + games[id].moves, 0),
    sizes: [...new Set(use.map((id) => games[id].size))].sort((a, b) => a - b)
  };
}
function pushHistory(hist, rec) {
  const out = hist.filter((h) => h.at !== rec.at);
  out.push(rec);
  return out.slice(-120);
}

// apps/web/lib/katago.ts
var { pickMove: pickMove2 } = enginepick_exports;
function enginePath(p, bin) {
  if (!/\.exe$/i.test(bin)) return p;
  const m = /^\/mnt\/([a-z])\/(.*)$/i.exec(p);
  if (!m) return p;
  return m[1].toUpperCase() + ":\\" + m[2].replace(/\//g, "\\");
}
function configFor(bin) {
  const explicit = process.env.KATAGO_CONFIG;
  if (explicit) return explicit;
  const dir = bin.replace(/[\\/][^\\/]+$/, "");
  for (const name of ["analysis_example.cfg", "analysis.cfg"]) {
    const guess = dir + "/" + name;
    if (existsSync(guess)) return guess;
  }
  return null;
}
function engineStatus() {
  const bin = process.env.KATAGO_BIN;
  const model = process.env.KATAGO_MODEL;
  if (!bin) {
    return { available: false, reason: "ยังไม่ได้ตั้งค่า KATAGO_BIN — ดูวิธีติดตั้งที่หน้าเครื่องประเมิน" };
  }
  if (!existsSync(bin)) {
    return { available: false, bin, reason: "ไม่พบไฟล์ตามที่ KATAGO_BIN ชี้ไว้: " + bin };
  }
  if (!process.env.KATAGO_FAKE) {
    if (!model) return { available: false, bin, reason: "ยังไม่ได้ตั้งค่า KATAGO_MODEL (ไฟล์โครงข่าย .bin.gz)" };
    if (!existsSync(model)) return { available: false, bin, model, reason: "ไม่พบไฟล์โครงข่ายตามที่ KATAGO_MODEL ชี้ไว้: " + model };
    if (!configFor(bin)) {
      return {
        available: false,
        bin,
        model,
        reason: "ไม่พบไฟล์ config — KataGo โหมด analysis บังคับต้องมี ปกติมี analysis_example.cfg แถมมาในโฟลเดอร์เดียวกับตัวโปรแกรมอยู่แล้ว ถ้าอยากใช้ไฟล์อื่นให้ตั้ง KATAGO_CONFIG"
      };
    }
  }
  return { available: true, bin, model };
}
function humanModelStatus() {
  const st = engineStatus();
  if (!st.available) return { ready: false, reason: st.reason };
  if (process.env.KATAGO_FAKE) return { ready: true };
  const hm = process.env.KATAGO_HUMAN_MODEL;
  if (!hm) return { ready: false, reason: "ยังไม่ได้ตั้งค่า KATAGO_HUMAN_MODEL (โมเดลเลียนแบบคน b18c384nbt-humanv0.bin.gz จากหน้า release v1.15.0 ของ KataGo)" };
  if (!existsSync(hm)) return { ready: false, reason: "ไม่พบไฟล์ตามที่ KATAGO_HUMAN_MODEL ชี้ไว้: " + hm };
  return { ready: true };
}
var Engine = class {
  proc = null;
  pending = /* @__PURE__ */ new Map();
  seq = 0;
  startErr = "";
  start() {
    if (this.proc && !this.proc.killed) return this.proc;
    const st = engineStatus();
    if (!st.available) return null;
    const cfg = process.env.KATAGO_FAKE ? null : configFor(st.bin);
    const args = process.env.KATAGO_FAKE ? [] : [
      "analysis",
      "-model",
      enginePath(st.model, st.bin),
      ...cfg ? ["-config", enginePath(cfg, st.bin)] : [],
      // โมเดลเลียนแบบคนโหลดคู่ไปด้วยถ้าตั้งไว้ — ไม่ได้เปลี่ยนการวิเคราะห์ปกติ ใช้เฉพาะคำถามที่ระบุ humanSLProfile
      ...humanModelStatus().ready ? ["-human-model", enginePath(process.env.KATAGO_HUMAN_MODEL, st.bin)] : []
    ];
    const p = spawn(st.bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    this.proc = p;
    this.startedAt = Date.now();
    this.startErr = "";
    createInterface({ input: p.stdout }).on("line", (line) => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      const id = String(msg.id ?? "");
      const w = this.pending.get(id);
      if (!w) return;
      if (msg.warning && !msg.error && !msg.rootInfo && !msg.moveInfos) {
        this.lastWarning = String(msg.warning);
        return;
      }
      this.pending.delete(id);
      clearTimeout(w.timer);
      if (msg.error) w.reject(new Error(String(msg.error)));
      else w.resolve(msg);
    });
    p.stderr.on("data", (d) => {
      this.startErr = (this.startErr + d).slice(-600);
    });
    p.on("exit", (code) => {
      if (this.proc !== p) return;
      this.proc = null;
      this.startedAt = 0;
      const why = new Error("เครื่องประเมินปิดตัวลง (code " + code + ")\n" + this.startErr.slice(-300));
      this.pending.forEach((w) => {
        clearTimeout(w.timer);
        w.reject(why);
      });
      this.pending.clear();
    });
    p.on("error", (e) => {
      if (this.proc === p) {
        this.proc = null;
        this.startedAt = 0;
      }
      this.startErr = String(e.message);
    });
    return p;
  }
  ask(query, timeoutMs) {
    const p = this.start();
    if (!p) return Promise.reject(new Error(engineStatus().reason || "เครื่องประเมินไม่พร้อม"));
    const id = "q" + ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("เครื่องประเมินไม่ตอบภายใน " + Math.round(timeoutMs / 1e3) + " วินาที — ถ้าเพิ่งเปิดใช้ครั้งแรก มันกำลังโหลดโครงข่ายอยู่ ลองใหม่อีกครั้ง"));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      p.stdin.write(JSON.stringify({ ...query, id }) + "\n");
    });
  }
  /** คำเตือนล่าสุดจากเครื่อง เก็บไว้ให้ดูตอนหาสาเหตุ ไม่ได้ทำให้คำถามล้ม */
  lastWarning = "";
  stop() {
    const why = new Error("เครื่องประเมินถูกปิดโดยผู้ใช้ — ลองใหม่ได้ เครื่องจะเปิดเองอีกครั้ง");
    this.pending.forEach((w) => {
      clearTimeout(w.timer);
      w.reject(why);
    });
    this.pending.clear();
    try {
      this.proc?.kill();
    } catch {
    }
    this.proc = null;
    this.startedAt = 0;
  }
  /** เวลาที่เปิดโปรเซสล่าสุด (ms) — 0 = ยังไม่ได้เปิด */
  startedAt = 0;
  /** สถานะสำหรับป้ายบนหัวเว็บ: เปิดค้างอยู่ไหม และกำลังคิดกี่คำถาม */
  state() {
    const running = !!this.proc && !this.proc.killed;
    return { running, busy: running ? this.pending.size : 0, startedAt: running ? this.startedAt : 0 };
  }
};
var g = globalThis;
var engine = g.__zenKatago || (g.__zenKatago = new Engine());
var RULES = [
  { key: "japanese", th: "ญี่ปุ่น", note: "นับพื้นที่ + เชลย — ที่ใช้กันในไทยและญี่ปุ่น" },
  { key: "chinese", th: "จีน", note: "นับพื้นที่ + หมากบนกระดาน — ที่ใช้ในจีนและเกมของ AlphaGo" }
];
async function analyze(req, timeoutMs = 6e4) {
  const stones = req.initialStones || [];
  const res = await engine.ask({
    rules: req.rules || "japanese",
    komi: req.komi,
    boardXSize: req.size,
    boardYSize: req.size,
    ...stones.length ? { initialStones: stones, initialPlayer: "W" } : {},
    moves: req.moves,
    analyzeTurns: [req.turn],
    maxVisits: req.visits,
    includeOwnership: !!req.ownership,
    /*
     * บังคับให้รายงานจากมุมของดำเสมอ ไม่ว่าไฟล์ config ของใครจะตั้งไว้ว่าอะไร
     *
     * ค่านี้ตั้งได้ในไฟล์ config (reportAnalysisWinratesAs) ซึ่งแปลว่าผลที่ได้
     * ขึ้นอยู่กับเครื่องของแต่ละคน ถ้าไม่บังคับตรงนี้ คนที่ใช้ config ต่างกัน
     * จะได้ตัวเลขคนละเครื่องหมายจากตำแหน่งเดียวกัน
     */
    overrideSettings: { reportAnalysisWinratesAs: "BLACK" }
  }, timeoutMs);
  const infos = (res.moveInfos || []).slice(0, 5).map((m) => ({
    move: String(m.move),
    winrate: Number(m.winrate),
    scoreLead: Number(m.scoreLead),
    visits: Number(m.visits),
    pv: (m.pv || []).slice(0, 8).map(String)
  }));
  const root = res.rootInfo || {};
  return {
    rules: req.rules || "japanese",
    blackWinrate: Number(root.winrate ?? 0.5),
    blackScoreLead: Number(root.scoreLead ?? 0),
    visits: Number(root.visits ?? 0),
    moves: infos,
    engine: { version: await engineVersion(), model: modelName() },
    /*
     * แผนที่พื้นที่: ค่าละจุด −1 (ขาวแน่) ถึง +1 (ดำแน่) เรียงแถวจากบนซ้าย — ตรงกับดัชนีของแอป (0 = A19)
     * เป็นมุมของดำเพราะ reportAnalysisWinratesAs ข้างบน · ปัดสองตำแหน่งพอสำหรับวาด ลดขนาดคำตอบ
     */
    ...req.ownership && Array.isArray(res.ownership) ? { ownership: res.ownership.map((v) => Math.round(Number(v) * 100) / 100) } : {}
  };
}
var versionCache = null;
function engineVersion() {
  if (versionCache !== null) return Promise.resolve(versionCache);
  const st = engineStatus();
  if (!st.available || process.env.KATAGO_FAKE) {
    versionCache = process.env.KATAGO_FAKE ? "เครื่องจำลองสำหรับทดสอบ" : "ไม่ทราบ";
    return Promise.resolve(versionCache);
  }
  return new Promise((resolve) => {
    execFile(st.bin, ["version"], { timeout: 2e4 }, (err, stdout) => {
      const line = String(stdout || "").split("\n").find((l) => /KataGo/i.test(l));
      versionCache = (line || "").trim() || "ไม่ทราบ";
      resolve(versionCache);
    });
  });
}
function modelName() {
  const m = process.env.KATAGO_MODEL || "";
  return m.split(/[\\/]/).pop()?.replace(/\.bin\.gz$/i, "") || "ไม่ทราบ";
}
function stopEngine() {
  engine.stop();
}
function engineState() {
  return engine.state();
}
var PLAY_LEVELS = [
  {
    key: "easy",
    th: "ฝึกมือ",
    maxLoss: 14,
    visits: 120,
    minVisits: 1,
    note: "ยอมเดินตาที่แย่กว่าตาดีที่สุดได้ถึง 14 แต้ม — ปล่อยช่องให้เห็นชัด"
  },
  {
    key: "light",
    th: "สบาย ๆ",
    maxLoss: 7,
    visits: 160,
    minVisits: 1,
    note: "ยอมเสียได้ 7 แต้มต่อตา — พลาดให้จับได้ แต่ไม่ปล่อยกลุ่มใหญ่ทิ้ง"
  },
  {
    key: "firm",
    th: "จริงจัง",
    maxLoss: 2.5,
    visits: 280,
    minVisits: 3,
    note: "ยอมเสียได้ 2.5 แต้ม — ต้องเล่นให้ถูกจริงถึงจะได้เปรียบ"
  },
  {
    key: "full",
    th: "เต็มกำลัง",
    maxLoss: 0,
    visits: 600,
    minVisits: 5,
    note: "เดินตาที่ดีที่สุดที่คิดออกเสมอ — ไม่ได้ปล่อยอะไรให้เลย"
  }
];
async function chooseMove(req, timeoutMs = 12e4) {
  const toPlayIsBlack = req.toPlay === "B";
  const stones = req.initialStones || [];
  const res = await engine.ask({
    rules: req.rules || "japanese",
    komi: req.komi,
    boardXSize: req.size,
    boardYSize: req.size,
    ...stones.length ? { initialStones: stones, initialPlayer: "W" } : {},
    moves: req.moves,
    analyzeTurns: [req.moves.length],
    maxVisits: req.level.visits,
    includeOwnership: false,
    overrideSettings: { reportAnalysisWinratesAs: "BLACK" }
  }, timeoutMs);
  const infos = res.moveInfos || [];
  if (!infos.length) {
    const root = res.rootInfo || {};
    return {
      move: "pass",
      best: "pass",
      loss: 0,
      pool: 0,
      blackScoreLead: Number(root.scoreLead ?? 0),
      blackWinrate: Number(root.winrate ?? 0.5),
      rootBlackScoreLead: Number(root.scoreLead ?? 0),
      rootBlackWinrate: Number(root.winrate ?? 0.5),
      visits: Number(root.visits ?? 0)
    };
  }
  const picked = pickMove2(infos, toPlayIsBlack, req.level.maxLoss, Math.random, req.level.minVisits);
  const pick = picked.move;
  const rootInfo = res.rootInfo || {};
  return {
    move: String(pick.move),
    best: String(picked.best.move),
    loss: picked.loss,
    blackScoreLead: Math.round(Number(pick.scoreLead) * 100) / 100,
    blackWinrate: Math.round(Number(pick.winrate) * 1e3) / 1e3,
    rootBlackScoreLead: Math.round(Number(rootInfo.scoreLead ?? 0) * 100) / 100,
    rootBlackWinrate: Math.round(Number(rootInfo.winrate ?? 0.5) * 1e3) / 1e3,
    pool: picked.pool,
    visits: Number(pick.visits ?? 0)
  };
}
var HUMAN_RANKS = [...Array(20)].map((_, i) => 20 - i + "k").concat([...Array(9)].map((_, i) => i + 1 + "d"));
function policyIndex(coord, size) {
  const m = /^([A-HJ-T])(\d{1,2})$/i.exec(coord);
  if (!m) return -1;
  const x = "ABCDEFGHJKLMNOPQRST".indexOf(m[1].toUpperCase());
  const y = size - Number(m[2]);
  return x >= 0 && y >= 0 && y < size && x < size ? y * size + x : -1;
}
async function humanMoveProbs(req, timeoutMs = 6e5) {
  const base = {
    moves: req.moves,
    rules: "japanese",
    komi: req.komi,
    boardXSize: req.size,
    boardYSize: req.size,
    maxVisits: 1,
    includePolicy: true
  };
  const area = req.size * req.size;
  return Promise.all(req.turns.map(async (t) => {
    const idx = policyIndex(req.moves[t][1], req.size);
    const per = await Promise.all(HUMAN_RANKS.map(async (r) => {
      const res = await engine.ask({
        ...base,
        analyzeTurns: [t],
        overrideSettings: { humanSLProfile: "rank_" + r, ignorePreRootHistory: false, reportAnalysisWinratesAs: "BLACK" }
      }, timeoutMs);
      const hp = Array.isArray(res.humanPolicy) ? res.humanPolicy : void 0;
      const p = hp ? Number(hp[idx]) : NaN;
      if (!hp || !Number.isFinite(p)) throw new Error("เครื่องประเมินไม่ส่ง humanPolicy กลับมา — ตรวจว่า KataGo รุ่น 1.15 ขึ้นไปและตั้ง KATAGO_HUMAN_MODEL แล้ว · ถ้าเพิ่งตั้งค่า ให้กดปิด KataGo ที่ป้ายบนหัวเว็บแล้วลองใหม่ (เครื่องที่เปิดค้างอยู่ยังไม่ได้โหลดโมเดลนี้)");
      let top = 0;
      for (let k = 1; k < hp.length; k++) if (hp[k] > hp[top]) top = k;
      return { p: Math.max(0, p), top: top >= area ? -1 : top, topP: Math.max(0, hp[top]) };
    }));
    return { t, played: idx, p: per.map((x) => x.p), top: per.map((x) => x.top), topP: per.map((x) => x.topP) };
  }));
}

// apps/web/app/api/analyze/route.ts
var runtime = "nodejs";
var dynamic = "force-dynamic";
async function GET() {
  const st = engineStatus();
  return Response.json({
    ...st,
    // บอกรุ่นเครื่องกับชื่อโครงข่ายด้วย เพื่อให้ผลที่ได้ตรวจย้อนได้ว่ามาจากอะไร
    ...st.available ? { version: await engineVersion(), modelName: modelName() } : {},
    note: "KataGo เป็นการประเมิน ไม่ใช่การพิสูจน์ — ตัวเลขจากมันไม่ถูกนำไปขยับเรต 6 แกน"
  });
}
var MAX_VISITS = 2e3;
async function POST(req) {
  const st = engineStatus();
  if (!st.available) {
    return Response.json({ ok: false, available: false, reason: st.reason }, { status: 200 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const size = Number(body.size);
  const turn = Number(body.turn);
  const moves = Array.isArray(body.moves) ? body.moves : null;
  if (!size || size < 2 || size > 19 || !moves || !Number.isFinite(turn) || turn < 0 || turn > moves.length) {
    return Response.json({ ok: false, reason: "ข้อมูลกระดานไม่ครบหรือไม่ถูกต้อง" }, { status: 400 });
  }
  const rules = body.rules;
  if (rules !== void 0 && !RULES.some((r) => r.key === rules)) {
    return Response.json({ ok: false, reason: 'ไม่รู้จักกติกา "' + rules + '"' }, { status: 400 });
  }
  const initialStones = Array.isArray(body.initialStones) ? body.initialStones : [];
  if (initialStones.length > 9) {
    return Response.json({ ok: false, reason: "หมากต่อเกินเก้าเม็ด" }, { status: 400 });
  }
  try {
    const out = await analyze({
      size,
      turn,
      rules,
      moves,
      initialStones,
      komi: Number.isFinite(Number(body.komi)) ? Number(body.komi) : 6.5,
      visits: Math.max(10, Math.min(MAX_VISITS, Number(body.visits) || 200)),
      ownership: body.ownership === true
    });
    return Response.json({ ok: true, available: true, ...out });
  } catch (e) {
    return Response.json({
      ok: false,
      available: true,
      reason: e instanceof Error ? e.message : "เครื่องประเมินตอบไม่ได้"
    }, { status: 200 });
  }
}

// apps/web/app/api/play/route.ts
var route_exports2 = {};
__export(route_exports2, {
  GET: () => GET2,
  POST: () => POST2,
  dynamic: () => dynamic2,
  runtime: () => runtime2
});
var runtime2 = "nodejs";
var dynamic2 = "force-dynamic";
async function GET2() {
  const st = engineStatus();
  return Response.json({
    ...st,
    levels: PLAY_LEVELS.map((l) => ({ key: l.key, th: l.th, maxLoss: l.maxLoss, visits: l.visits, note: l.note })),
    ...st.available ? { version: await engineVersion(), modelName: modelName() } : {},
    note: 'ระดับของเครื่องคือ "ยอมเดินตาที่เสียได้กี่แต้ม" ไม่ใช่ขั้นคิว/ดั้ง ซึ่งแอปนี้ไม่อ้าง'
  });
}
var MAX_MOVES = 600;
async function POST2(req) {
  const st = engineStatus();
  if (!st.available) {
    return Response.json({ ok: false, available: false, reason: st.reason }, { status: 200 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const size = Number(body.size);
  const moves = Array.isArray(body.moves) ? body.moves : null;
  if (!size || size < 2 || size > 19 || !moves || moves.length > MAX_MOVES) {
    return Response.json({ ok: false, reason: "ข้อมูลกระดานไม่ครบหรือไม่ถูกต้อง" }, { status: 400 });
  }
  const toPlay = body.toPlay === "B" || body.toPlay === "W" ? body.toPlay : null;
  if (!toPlay) {
    return Response.json({ ok: false, reason: "ไม่ได้บอกว่าถึงตาใคร" }, { status: 400 });
  }
  const initialStones = Array.isArray(body.initialStones) ? body.initialStones : [];
  if (initialStones.length > 9) {
    return Response.json({ ok: false, reason: "หมากต่อเกินเก้าเม็ด" }, { status: 400 });
  }
  const level = PLAY_LEVELS.find((l) => l.key === body.level);
  if (!level) {
    return Response.json({ ok: false, reason: 'ไม่รู้จักระดับ "' + String(body.level) + '"' }, { status: 400 });
  }
  const rules = body.rules;
  if (rules !== void 0 && !RULES.some((r) => r.key === rules)) {
    return Response.json({ ok: false, reason: 'ไม่รู้จักกติกา "' + String(rules) + '"' }, { status: 400 });
  }
  try {
    const out = await chooseMove({
      size,
      level,
      toPlay,
      rules,
      komi: Number.isFinite(Number(body.komi)) ? Number(body.komi) : 6.5,
      initialStones,
      moves
    });
    return Response.json({ ok: true, available: true, level: level.key, ...out });
  } catch (e) {
    return Response.json({
      ok: false,
      available: true,
      reason: e instanceof Error ? e.message : "เครื่องคิดตาไม่ได้"
    }, { status: 200 });
  }
}

// apps/web/app/api/engine/route.ts
var route_exports3 = {};
__export(route_exports3, {
  GET: () => GET3,
  POST: () => POST3,
  dynamic: () => dynamic3
});
var dynamic3 = "force-dynamic";
function snapshot() {
  return { installed: engineStatus().available, ...engineState() };
}
async function GET3() {
  return Response.json(snapshot(), { headers: { "cache-control": "no-store" } });
}
async function POST3(req) {
  const body = await req.json().catch(() => ({}));
  if (body?.action !== "stop") return Response.json({ error: 'action ต้องเป็น "stop"' }, { status: 400 });
  stopEngine();
  return Response.json(snapshot(), { headers: { "cache-control": "no-store" } });
}

// apps/web/app/api/rank/route.ts
var route_exports4 = {};
__export(route_exports4, {
  GET: () => GET4,
  POST: () => POST4,
  dynamic: () => dynamic4,
  runtime: () => runtime3
});
var runtime3 = "nodejs";
var dynamic4 = "force-dynamic";
async function GET4() {
  const hm = humanModelStatus();
  return Response.json({ available: hm.ready, reason: hm.reason, error: rankest_exports.MEASURED_ERROR });
}
var SIZES = /* @__PURE__ */ new Set([9, 13, 19]);
async function POST4(req) {
  const hm = humanModelStatus();
  if (!hm.ready || !engineStatus().available) return Response.json({ ok: false, available: false, reason: hm.reason });
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "รูปแบบคำขอไม่ถูกต้อง" }, { status: 400 });
  }
  const size = Number(body.size), komi = Number(body.komi ?? 6.5);
  const moves = Array.isArray(body.moves) ? body.moves : null;
  const me = body.me === "W" ? "W" : body.me === "both" ? "both" : "B";
  const okMove = (m) => Array.isArray(m) && (m[0] === "B" || m[0] === "W") && typeof m[1] === "string" && (/^pass$/i.test(m[1]) || /^[A-HJ-T]\d{1,2}$/i.test(m[1]));
  if (!SIZES.has(size) || !moves || moves.length > 400 || !moves.every(okMove) || !Number.isFinite(komi)) {
    return Response.json({ ok: false, reason: "ข้อมูลเกมไม่ถูกต้อง" }, { status: 400 });
  }
  const turns = moves.map((m, k) => k).filter((k) => !/^pass$/i.test(moves[k][1]) && (me === "both" || moves[k][0] === me));
  if (turns.length < 10) return Response.json({ ok: false, reason: "เกมสั้นเกินไป — ต้องมีตาของคุณอย่างน้อย 10 ตา" });
  try {
    const t0 = Date.now();
    const data = await humanMoveProbs({ size, komi, moves, turns });
    const ll = rankest_exports.emptyLL();
    data.forEach((d) => rankest_exports.addMove(ll, d.p));
    return Response.json({ ok: true, size, moves: turns.length, ll, turns: data, ms: Date.now() - t0 });
  } catch (e) {
    return Response.json({ ok: false, reason: e.message });
  }
}

// tools/katago-bridge/bridge.ts
var VERSION = true ? "0.1.0" : "dev";
var DEFAULT_PORT = 41950;
var DEFAULT_ORIGINS = ["https://zen-gosensei.vercel.app"];
var DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;
var MAX_BODY = 512 * 1024;
var ROUTES = {
  "/api/analyze": route_exports,
  "/api/play": route_exports2,
  "/api/engine": route_exports3,
  "/api/rank": route_exports4
};
function configDir() {
  if (process.env.ZEN_BRIDGE_HOME) return process.env.ZEN_BRIDGE_HOME;
  if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "zen-katago-bridge");
  if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "zen-katago-bridge");
  return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), "zen-katago-bridge");
}
var CONFIG_FILE = () => path.join(configDir(), "config.json");
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE(), "utf8"));
  } catch {
    return {};
  }
}
function saveConfig(c) {
  fs.mkdirSync(configDir(), { recursive: true, mode: 448 });
  fs.writeFileSync(CONFIG_FILE(), JSON.stringify(c, null, 2) + "\n", { mode: 384 });
  try {
    fs.chmodSync(CONFIG_FILE(), 384);
  } catch {
  }
}
var newToken = () => randomBytes(18).toString("base64url");
function applyEnv(c) {
  const set = (k, v) => {
    if (v && !process.env[k]) process.env[k] = path.resolve(v);
  };
  set("KATAGO_BIN", c.katago);
  set("KATAGO_MODEL", c.model);
  set("KATAGO_CONFIG", c.config);
  set("KATAGO_HUMAN_MODEL", c.humanModel);
}
function arg(argv2, name) {
  const i = argv2.indexOf(name);
  return i >= 0 ? argv2[i + 1] : void 0;
}
var HELP = `ZeN KataGo Bridge ${VERSION} — ต่อเว็บ ZeN-GoSensei เข้ากับ KataGo บนเครื่องคุณ

ใช้:
  node zen-katago-bridge.mjs setup --katago <ไฟล์โปรแกรม katago> --model <ไฟล์โครงข่าย .bin.gz>
        [--config <analysis.cfg>] [--human-model <b18c384nbt-humanv0.bin.gz>] [--port ${DEFAULT_PORT}]
        [--origin <https://เว็บอื่นที่อนุญาต>]
  node zen-katago-bridge.mjs            เปิดตัวเชื่อม (ปล่อยหน้าต่างนี้ไว้ระหว่างใช้เว็บ)
  node zen-katago-bridge.mjs check      ตรวจว่าตั้งค่าครบไหม
  node zen-katago-bridge.mjs token      แสดงรหัสจับคู่
  node zen-katago-bridge.mjs token --new  สุ่มรหัสจับคู่ใหม่ (เว็บที่เคยจับคู่ต้องใส่รหัสใหม่)

ไฟล์ตั้งค่า: ${CONFIG_FILE()}`;
function check(c) {
  applyEnv(c);
  const st = engineStatus();
  console.log("KataGo:   " + (st.available ? "พร้อม — " + st.bin : "ยังไม่พร้อม — " + st.reason));
  if (st.available) {
    const hm = humanModelStatus();
    console.log("โมเดลเลียนแบบคน (ไม่บังคับ): " + (hm.ready ? "มี" : "ไม่มี — " + hm.reason));
  }
  return st.available;
}
function setup(argv2) {
  const c = loadConfig();
  const pick = (flag, key) => {
    const v = arg(argv2, flag);
    if (v) c[key] = path.resolve(v);
  };
  pick("--katago", "katago");
  pick("--model", "model");
  pick("--config", "config");
  pick("--human-model", "humanModel");
  const port = Number(arg(argv2, "--port"));
  if (port) c.port = port;
  const origin = arg(argv2, "--origin");
  if (origin) {
    if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) {
      console.error("--origin ต้องเป็น https://ชื่อโดเมน เท่านั้น");
      process.exit(2);
    }
    c.origins = [.../* @__PURE__ */ new Set([...c.origins || [], origin])];
  }
  c.token ||= newToken();
  saveConfig(c);
  console.log("บันทึกแล้ว: " + CONFIG_FILE());
  check(c);
}
function originOk(c, origin) {
  if (!origin) return false;
  if (DEFAULT_ORIGINS.includes(origin) || (c.origins || []).includes(origin)) return true;
  return c.allowDev !== false && DEV_ORIGIN.test(origin);
}
function tokenOk(c, got) {
  if (!got || !c.token) return false;
  const a = Buffer.from(got), b = Buffer.from(c.token);
  return a.length === b.length && timingSafeEqual(a, b);
}
function hidePaths(text) {
  try {
    const j = JSON.parse(text);
    for (const k of ["bin", "model"]) if (typeof j[k] === "string") j[k] = path.basename(j[k]);
    if (typeof j.reason === "string") j.reason = j.reason.replace(/(?:[A-Za-z]:)?[\\/][^\s:]+[\\/]([^\\/\s]+)/g, "…/$1");
    return JSON.stringify(j);
  } catch {
    return text;
  }
}
function serve(c) {
  applyEnv(c);
  if (!c.token) {
    c.token = newToken();
    saveConfig(c);
  }
  const port = c.port || DEFAULT_PORT;
  const hostOk = (h) => !!h && [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(h.toLowerCase());
  const server = http.createServer((req, res) => {
    const origin = req.headers.origin;
    const send = (status, body, extra = {}) => {
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra });
      res.end(body);
    };
    if (!hostOk(req.headers.host)) return send(421, '{"error":"host"}');
    if (!originOk(c, origin)) return send(403, '{"error":"origin ไม่อยู่ในรายชื่อที่อนุญาต"}');
    const cors = { "access-control-allow-origin": origin, vary: "Origin" };
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const route = ROUTES[url.pathname];
    if (req.method === "OPTIONS") {
      return send(204, "", {
        ...cors,
        "access-control-allow-methods": "GET, POST",
        "access-control-allow-headers": "content-type, x-zen-bridge-token",
        // Chrome ถามก่อนให้เว็บสาธารณะคุยกับเครื่องตัวเอง (Private/Local Network Access) — ตอบว่ายอม
        "access-control-allow-private-network": "true",
        "access-control-max-age": "600"
      });
    }
    if (!tokenOk(c, req.headers["x-zen-bridge-token"])) {
      return send(401, '{"error":"รหัสจับคู่ไม่ถูกต้อง — ดูรหัสที่หน้าต่างตัวเชื่อม แล้วใส่ใหม่ในหน้า การตั้งค่า AI และ KataGo"}', cors);
    }
    if (url.pathname === "/bridge") {
      return send(200, JSON.stringify({ bridge: "zen-katago-bridge", version: VERSION }), cors);
    }
    const fn = route?.[req.method];
    if (!fn) return send(404, '{"error":"ไม่มีเส้นทางนี้"}', cors);
    const chunks = [];
    let size = 0, tooBig = false;
    req.on("data", (b) => {
      size += b.length;
      if (size > MAX_BODY) {
        tooBig = true;
        req.destroy();
      } else chunks.push(b);
    });
    req.on("end", async () => {
      if (tooBig) return;
      try {
        const r = await fn(new Request("http://127.0.0.1" + url.pathname, {
          method: req.method,
          headers: { "content-type": "application/json" },
          body: req.method === "POST" ? Buffer.concat(chunks) : void 0
        }));
        send(r.status, hidePaths(await r.text()), cors);
      } catch (e) {
        send(500, JSON.stringify({ ok: false, reason: "ตัวเชื่อมผิดพลาด: " + e.message }), cors);
      }
    });
    req.on("error", () => {
      if (!res.headersSent) send(413, '{"error":"คำขอใหญ่เกินไป"}', cors);
    });
  });
  server.on("error", (e) => {
    console.error(e.code === "EADDRINUSE" ? `พอร์ต ${port} ถูกใช้อยู่ — ตัวเชื่อมเปิดค้างอยู่แล้วหรือเปล่า? (เปลี่ยนพอร์ตด้วย setup --port)` : e.message);
    process.exit(1);
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`ZeN KataGo Bridge ${VERSION} — เปิดแล้วที่ http://127.0.0.1:${port}`);
    check(c);
    console.log("\nรหัสจับคู่: " + c.token);
    console.log('ใส่รหัสนี้ที่หน้า "การตั้งค่า AI และ KataGo" → แท็บ KataGo ในเว็บ · ปิดหน้าต่างนี้ = ปิดตัวเชื่อม (Ctrl+C)');
    console.log("เว็บที่อนุญาต: " + [...DEFAULT_ORIGINS, ...c.origins || [], ...c.allowDev !== false ? ["http://localhost:*"] : []].join(", "));
  });
  const stop = () => {
    POST3?.(new Request("http://x", { method: "POST", body: '{"action":"stop"}' }));
    server.close();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
var argv = process.argv.slice(2);
var cmd = argv[0] && !argv[0].startsWith("-") ? argv[0] : "serve";
if (argv.includes("--help") || argv.includes("-h") || cmd === "help") console.log(HELP);
else if (cmd === "setup") setup(argv);
else if (cmd === "check") process.exit(check(loadConfig()) ? 0 : 1);
else if (cmd === "token") {
  const c = loadConfig();
  if (argv.includes("--new") || !c.token) {
    c.token = newToken();
    saveConfig(c);
  }
  console.log(c.token);
} else if (cmd === "serve") serve(loadConfig());
else {
  console.log(HELP);
  process.exit(2);
}
