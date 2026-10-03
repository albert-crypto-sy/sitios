/* Neón Bros — un plataformas sencillo en pixel art neón. Sin dependencias. */
(() => {
  "use strict";

  /* ---------- Constantes ---------- */
  const VW = 320, VH = 192;          // resolución interna
  const T = 16;                      // tamaño del tile
  const ROWS = 12;
  const STEP = 1000 / 60;

  const C = {
    bg0: "#07021a", bg1: "#1a0638",
    cyan: "#00f0ff", magenta: "#ff2bd6", lime: "#39ff14",
    yellow: "#ffe600", orange: "#ff8a00", purple: "#9d4dff",
    white: "#ffffff", skin: "#ffd1a8", dark: "#120a2a",
  };

  /* ---------- Lienzos ---------- */
  const screen = document.getElementById("screen");
  const sctx = screen.getContext("2d");
  const buf = document.createElement("canvas");
  buf.width = VW; buf.height = VH;
  const ctx = buf.getContext("2d");
  const glow = document.createElement("canvas");
  glow.width = VW; glow.height = VH;
  const gctx = glow.getContext("2d");
  const canBlur = typeof gctx.filter === "string";

  let view = { s: 1, x: 0, y: 0 };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    screen.width = Math.round(innerWidth * dpr);
    screen.height = Math.round(innerHeight * dpr);
    const s = Math.min(screen.width / VW, screen.height / VH);
    view = { s, x: Math.round((screen.width - VW * s) / 2), y: Math.round((screen.height - VH * s) / 2) };
  }
  addEventListener("resize", resize);
  resize();

  /* ---------- Sprites a partir de mapas de píxeles ---------- */
  function sprite(rows, pal) {
    const c = document.createElement("canvas");
    c.width = rows[0].length; c.height = rows.length;
    const x = c.getContext("2d");
    rows.forEach((r, j) => [...r].forEach((ch, i) => {
      if (pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); }
    }));
    return c;
  }
  const PP = { M: C.magenta, S: C.skin, K: C.dark, C: C.cyan, Y: C.yellow, W: C.white };
  const top = [
    "....MMMMM...",
    "...MMMMMMMMM",
    "...SSSKS....",
    "..SSSSKSSS..",
    "..SSSSSSSS..",
    "....SSSSS...",
    "...CCMCC....",
    "..CCCMCCC...",
    ".CCCCMMCCCC.",
    ".SSCCYYCCSS.",
    ".SS.CCCC.SS.",
    "...CCCCCC...",
  ];
  const PLAYER = {
    idle: sprite([...top, "...CC..CC...", "..CCC..CCC..", "..YYY..YYY..", ".YYYY..YYYY."], PP),
    run1: sprite([...top, "...CC.CCC...", "..CC....CC..", ".YY......YY.", ".YYY....YYY."], PP),
    run2: sprite([...top, "....CCCC....", "....CCC.....", "....YYY.....", "...YYYY....."], PP),
    jump: sprite([
      "....MMMMM..S",
      "...MMMMMMMMS",
      "...SSSKS..CC",
      "..SSSSKSSSCC",
      "..SSSSSSSSC.",
      "....SSSSSC..",
      "...CCMCCC...",
      "S.CCCMCC....",
      "SCCCCMMCC...",
      ".CCCCYYCC...",
      "....CCCC....",
      "...CCCCCC...",
      "..CCC.CCC...",
      ".CC.....CC..",
      "YY.......YY.",
      "YY........YY",
    ], PP),
    dead: sprite([
      "....MMMMM...",
      "...MMMMMMMM.",
      "...SKSSKS...",
      "..SSSSSSSS..",
      "..SSKKKKSS..",
      "....SSSSS...",
      "S..CCMCC...S",
      "SCCCCMCCCCCS",
      "..CCCMMCC...",
      "...CCYYCC...",
      "...CCCCCC...",
      "...CCCCCC...",
      "...CC..CC...",
      "..CCC..CCC..",
      "..YYY..YYY..",
      ".YYYY..YYYY.",
    ], PP),
  };
  const EP = { G: C.magenta, W: C.white, K: C.dark, Y: C.orange };
  const ebody = [
    "....GGGGGG....",
    "..GGGGGGGGGG..",
    ".GGGGGGGGGGGG.",
    "GGWWKGGGGWWKGG",
    "GGWWKGGGGWWKGG",
    "GGGGGGGGGGGGGG",
    "GGGGKKKKKKGGGG",
    ".GGGGGGGGGGGG.",
    "..GGGGGGGGGG..",
  ];
  const ENEMY = [
    sprite([...ebody, "...YY....YY...", "..YYY....YYY..", ".............."], EP),
    sprite([...ebody, "....YY..YY....", "....YYY.YYY...", ".............."], EP),
  ];
  const ENEMY_FLAT = sprite([
    "..GGGGGGGGGG..",
    "GGWKGGGGGGWKGG",
    "GGGGGGGGGGGGGG",
    ".YYY......YYY.",
  ], EP);

  /* ---------- Nivel ---------- */
  const COLS = 212;
  let grid, coins, enemies, flagX;

  function buildLevel() {
    grid = Array.from({ length: ROWS }, () => new Array(COLS).fill("."));
    coins = []; enemies = [];
    const set = (x, y, ch) => { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) grid[y][x] = ch; };
    const ground = (a, b) => { for (let x = a; x <= b; x++) { set(x, 10, "#"); set(x, 11, "#"); } };
    const row = (a, b, y, ch) => { for (let x = a; x <= b; x++) set(x, y, ch); };
    const pipe = (x, h) => { for (let y = 10 - h; y < 10; y++) { set(x, y, "p"); set(x + 1, y, "p"); } };
    const stairs = (x, n, dir) => {
      for (let i = 0; i < n; i++) for (let y = 0; y <= i; y++) set(dir > 0 ? x + i : x + n - 1 - i, 9 - y, "#");
    };
    const coin = (x, y) => coins.push({ x: x * T + 4, y: y * T + 2, w: 8, h: 12, taken: false });
    const enemy = (x, row = 9) => enemies.push({ x: x * T, y: row * T + 4, w: 14, h: 12, vx: -0.45, vy: 0, alive: true, flat: 0, active: false });

    // suelo con huecos
    ground(0, 68); ground(71, 86); ground(90, 151); ground(154, 211);

    // bloque 1: primeros saltos
    set(16, 6, "?");
    row(20, 24, 6, "B"); set(21, 6, "?"); set(23, 6, "?"); set(22, 2, "?");
    pipe(28, 2); pipe(38, 3); pipe(46, 4); pipe(57, 4);
    enemy(22); enemy(40); enemy(50); enemy(52);

    // monedas sobre el primer hueco
    for (let x = 66; x <= 72; x++) coin(x, 7);

    // plataformas elevadas
    row(77, 79, 6, "B"); set(78, 6, "?");
    row(80, 87, 2, "B"); enemy(82, 1); enemy(85, 1);
    row(91, 93, 2, "B"); set(94, 2, "?"); set(94, 6, "B");
    for (let x = 80; x <= 87; x++) coin(x, 1);
    enemy(97); enemy(99);
    row(100, 101, 6, "B");
    set(106, 6, "?"); set(109, 6, "?"); set(109, 2, "?"); set(112, 6, "?");
    enemy(114); enemy(116);
    set(118, 6, "B"); row(121, 123, 2, "B");
    row(128, 131, 2, "B"); row(129, 130, 6, "B"); set(128, 2, "?"); set(131, 2, "?");
    enemy(124); enemy(126); enemy(131);

    // escaleras y huecos
    stairs(134, 4, 1); stairs(140, 4, -1);
    stairs(147, 5, 1);
    stairs(154, 5, -1);
    for (let x = 143; x <= 147; x++) coin(x, 4);

    // tramo final
    pipe(163, 2); row(168, 171, 6, "B"); set(170, 6, "?");
    enemy(174); enemy(176);
    pipe(179, 2);
    stairs(181, 8, 1); set(189, 9, "#"); set(189, 8, "#"); set(189, 7, "#"); set(189, 6, "#"); set(189, 5, "#"); set(189, 4, "#"); set(189, 3, "#"); set(189, 2, "#");
    for (let x = 158; x <= 162; x++) coin(x, 6);

    flagX = 198 * T;
  }

  const SOLID = new Set(["#", "B", "?", "U", "p"]);
  const tileAt = (tx, ty) => (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) ? (tx < 0 ? "#" : ".") : grid[ty][tx];
  const solid = (tx, ty) => SOLID.has(tileAt(tx, ty));

  /* ---------- Entrada ---------- */
  const keys = { left: false, right: false, jump: false };
  let jumpPressed = false;
  const KEYMAP = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    ArrowUp: "jump", KeyW: "jump", Space: "jump", KeyZ: "jump",
  };
  addEventListener("keydown", (e) => {
    const k = KEYMAP[e.code];
    if (k) {
      e.preventDefault();
      if (k === "jump" && !keys.jump) jumpPressed = true;
      keys[k] = true;
    }
    if (e.code === "Enter" || e.code === "Space") startOrContinue();
    if (e.code === "KeyM") toggleMute();
    unlockAudio();
  });
  addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });

  document.querySelectorAll(".touch button").forEach((b) => {
    const k = b.dataset.key;
    const on = (e) => {
      e.preventDefault();
      if (k === "jump" && !keys.jump) jumpPressed = true;
      keys[k] = true; b.classList.add("on");
      unlockAudio();
      if (k === "jump") startOrContinue();
    };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("pointerleave", off);
  });
  screen.addEventListener("pointerdown", () => { unlockAudio(); startOrContinue(); });

  /* ---------- Sonido (WebAudio, sin archivos) ---------- */
  let ac = null, muted = false;
  function unlockAudio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* sin audio */ } }
    if (ac && ac.state === "suspended") ac.resume();
  }
  function toggleMute() { muted = !muted; }
  function beep(f0, f1, dur, type = "square", vol = 0.06, delay = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    jump: () => beep(300, 700, 0.14),
    coin: () => { beep(988, 988, 0.06, "square", 0.05); beep(1319, 1319, 0.22, "square", 0.05, 0.06); },
    stomp: () => beep(500, 80, 0.12, "triangle", 0.12),
    bump: () => beep(140, 90, 0.08, "square", 0.08),
    brick: () => beep(220, 40, 0.18, "sawtooth", 0.07),
    die: () => [659, 523, 392, 262].forEach((f, i) => beep(f, f * 0.98, 0.16, "square", 0.06, i * 0.15)),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => beep(f, f, 0.14, "square", 0.05, i * 0.11)),
  };

  /* ---------- Estado del juego ---------- */
  let state = "title";   // title | play | dying | win | over
  let player, cam, score, coinCount, lives, time, timer, particles, popups, bumps, stateT, frame, best;
  try { best = parseInt(localStorage.getItem("neon-best") || "0", 10) || 0; } catch { best = 0; }

  function resetPlayer() {
    player = { x: 3 * T, y: 8 * T, w: 10, h: 15, vx: 0, vy: 0, onGround: false, face: 1, anim: 0, jumpHold: 0, inv: 0 };
    cam = 0;
    time = 300; timer = 0;
  }
  function newGame() {
    buildLevel();
    score = 0; coinCount = 0; lives = 3;
    particles = []; popups = []; bumps = [];
    resetPlayer();
    state = "play"; stateT = 0;
    jumpPressed = false;
  }
  function startOrContinue() {
    if (state === "title" || state === "over" || (state === "win" && stateT > 90)) newGame();
  }

  /* ---------- Física ---------- */
  function moveX(e) {
    e.x += e.vx;
    const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 1) / T);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w) / T);
      for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { e.x = tx * T - e.w; e.vx = 0; return true; }
    } else if (e.vx < 0) {
      const tx = Math.floor(e.x / T);
      for (let ty = y0; ty <= y1; ty++) if (solid(tx, ty)) { e.x = (tx + 1) * T; e.vx = 0; return true; }
    }
    return false;
  }
  function moveY(e, onHead) {
    e.y += e.vy;
    const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 1) / T);
    e.onGround = false;
    if (e.vy > 0) {
      const ty = Math.floor((e.y + e.h) / T);
      for (let tx = x0; tx <= x1; tx++) if (solid(tx, ty)) { e.y = ty * T - e.h; e.vy = 0; e.onGround = true; return; }
    } else if (e.vy < 0) {
      const ty = Math.floor(e.y / T);
      // golpea el tile más cercano al centro
      const cx = Math.floor((e.x + e.w / 2) / T);
      const order = [cx, x0, x1];
      for (const tx of order) if (solid(tx, ty)) { e.y = (ty + 1) * T; e.vy = 0; onHead && onHead(tx, ty); return; }
    }
  }

  function hitBlock(tx, ty) {
    const t = grid[ty][tx];
    if (t === "?") {
      grid[ty][tx] = "U";
      bumps.push({ tx, ty, t: 0 });
      coinCount++; score += 200; sfx.coin();
      popups.push({ x: tx * T + 4, y: ty * T - 4, vy: -3, t: 0, kind: "coin" });
      killAbove(tx, ty);
    } else if (t === "B") {
      grid[ty][tx] = ".";
      score += 50; sfx.brick();
      for (let i = 0; i < 8; i++) {
        particles.push({ x: tx * T + 8, y: ty * T + 8, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1, life: 50, col: C.purple });
      }
      killAbove(tx, ty);
    } else {
      bumps.push({ tx, ty, t: 0 });
      sfx.bump();
    }
  }
  function killAbove(tx, ty) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.x + e.w > tx * T && e.x < (tx + 1) * T && Math.abs(e.y + e.h - ty * T) < 3) squash(e, true);
    }
    for (const c of coins) {
      if (!c.taken && c.x + c.w > tx * T && c.x < (tx + 1) * T && Math.abs(c.y + c.h - ty * T) < 4) takeCoin(c);
    }
  }
  function squash(e, flip) {
    e.alive = false; e.flat = 30;
    score += 100; sfx.stomp();
    popups.push({ x: e.x, y: e.y - 6, vy: -0.6, t: 0, kind: "text", text: "100" });
    if (flip) { e.vy = -3; e.flat = 0; e.flip = true; }
  }
  function takeCoin(c) {
    c.taken = true; coinCount++; score += 100; sfx.coin();
    for (let i = 0; i < 6; i++) particles.push({ x: c.x + 4, y: c.y + 6, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 25, col: C.yellow });
  }

  function die() {
    if (state !== "play") return;
    state = "dying"; stateT = 0;
    player.vy = -5; player.vx = 0;
    sfx.die();
  }

  /* ---------- Actualización ---------- */
  function update() {
    frame++;
    stateT++;
    for (const b of bumps) b.t++;
    bumps = bumps.filter((b) => b.t < 10);
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life--; }
    particles = particles.filter((p) => p.life > 0);
    for (const p of popups) { p.t++; p.y += p.vy; if (p.kind === "coin") p.vy += 0.25; }
    popups = popups.filter((p) => (p.kind === "coin" ? p.t < 24 : p.t < 40));

    if (state === "dying") {
      if (stateT > 30) { player.vy += 0.3; player.y += player.vy; }
      if (stateT > 150) {
        lives--;
        if (lives <= 0) { state = "over"; stateT = 0; saveBest(); }
        else { buildLevelKeepScore(); resetPlayer(); state = "play"; stateT = 0; }
      }
      return;
    }
    if (state === "win") {
      if (player.y + player.h < 10 * T) { player.y += 2; }
      else if (player.x < flagX + 4 * T + 26) { player.x += 1; player.anim += 0.2; }
      if (time > 0 && stateT > 40) { const d = Math.min(time, 3); time -= d; score += d * 10; if (frame % 4 === 0) beep(1200, 1200, 0.03, "square", 0.03); if (time === 0) saveBest(); }
      return;
    }
    if (state !== "play") return;

    // tiempo
    if (++timer >= 40) { timer = 0; time--; if (time <= 0) { time = 0; die(); return; } }

    const p = player;
    const accel = p.onGround ? 0.22 : 0.14;
    const maxV = 2.2;
    if (keys.left && !keys.right) { p.vx = Math.max(p.vx - accel, -maxV); p.face = -1; }
    else if (keys.right && !keys.left) { p.vx = Math.min(p.vx + accel, maxV); p.face = 1; }
    else { p.vx *= p.onGround ? 0.8 : 0.95; if (Math.abs(p.vx) < 0.05) p.vx = 0; }

    if (jumpPressed && p.onGround) {
      p.vy = -5.2 - Math.abs(p.vx) * 0.25;
      p.jumpHold = 14;
      sfx.jump();
    }
    jumpPressed = false;
    if (keys.jump && p.jumpHold > 0 && p.vy < 0) { p.vy -= 0.22; p.jumpHold--; } else p.jumpHold = 0;
    p.vy = Math.min(p.vy + 0.32, 6);

    moveX(p);
    if (p.x < cam) { p.x = cam; p.vx = 0; }
    moveY(p, hitBlock);
    p.anim += Math.abs(p.vx) * 0.12;
    if (p.inv > 0) p.inv--;
    if (p.y > VH + 16) { die(); return; }

    // monedas
    for (const c of coins) {
      if (!c.taken && overlap(p, c)) takeCoin(c);
    }

    // enemigos
    for (const e of enemies) {
      if (!e.active && e.x < cam + VW + 16) e.active = true;
      if (!e.active) continue;
      if (!e.alive) {
        if (e.flip) { e.vy += 0.3; e.y += e.vy; }
        else if (e.flat > 0) e.flat--;
        continue;
      }
      e.vy = Math.min(e.vy + 0.3, 6);
      const dir = e.vx;
      if (moveX(e)) e.vx = -dir;
      moveY(e);
      if (e.y > VH + 20) e.alive = false;
      for (const o of enemies) {
        if (o !== e && o.alive && overlap(e, o)) {
          if ((e.vx > 0 && e.x < o.x) || (e.vx < 0 && e.x > o.x)) e.vx = -e.vx;
        }
      }
      if (overlap(p, e)) {
        if (p.vy > 0 && p.y + p.h - e.y < 8) {
          squash(e, false);
          p.vy = keys.jump ? -5.5 : -3.6;
          p.jumpHold = keys.jump ? 8 : 0;
        } else if (p.inv === 0) {
          die(); return;
        }
      }
    }

    // bandera
    if (p.x + p.w >= flagX + 6) {
      p.x = flagX + 6 - p.w; p.vx = 0; p.vy = 0;
      state = "win"; stateT = 0;
      const h = Math.max(0, 10 * T - p.y);
      const bonus = Math.round(h / T) * 100;
      score += bonus;
      popups.push({ x: flagX + 10, y: p.y, vy: -0.4, t: 0, kind: "text", text: String(bonus) });
      sfx.win();
      saveBest();
    }

    // cámara
    const target = p.x - VW * 0.4;
    if (target > cam) cam = Math.min(target, COLS * T - VW);
  }
  function buildLevelKeepScore() { const s = score, c = coinCount; buildLevel(); score = s; coinCount = c; particles = []; popups = []; }
  function saveBest() { if (score > best) { best = score; try { localStorage.setItem("neon-best", String(best)); } catch { /* sin almacenamiento */ } } }
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* ---------- Dibujo ---------- */
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * VW * 2, y: Math.random() * 110, s: Math.random() < 0.15 ? 2 : 1, p: Math.random() * 6 }));
  const skyline = (seed, n, minH, maxH) => {
    const out = []; let x = 0, r = seed;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    while (x < 640) { const w = 14 + rnd() * 26; out.push({ x, w, h: minH + rnd() * (maxH - minH), win: rnd() }); x += w + 2; }
    return { out, n };
  };
  const far = skyline(7, 0, 30, 70), near = skyline(42, 0, 20, 50);

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, C.bg0); g.addColorStop(0.7, C.bg1); g.addColorStop(1, "#2b0a4a");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

    // estrellas
    for (const s of stars) {
      const x = ((s.x - cam * 0.05) % (VW * 2) + VW * 2) % (VW * 2);
      if (x > VW) continue;
      const tw = Math.sin(frame * 0.05 + s.p) > 0.6;
      ctx.fillStyle = tw ? C.white : "#8a7bd8";
      ctx.fillRect(x | 0, s.y | 0, s.s, s.s);
    }
    // sol synthwave
    const sx = 230 - (cam * 0.08) % 900, sy = 92;
    if (sx > -60 && sx < VW + 60) {
      for (let y = -36; y <= 36; y += 1) {
        if (y > 4 && (y % 6 === 0 || y % 6 === 1)) continue;
        const w = Math.sqrt(36 * 36 - y * y) | 0;
        ctx.fillStyle = y < 0 ? C.magenta : C.orange;
        ctx.fillRect((sx - w) | 0, (sy + y) | 0, w * 2, 1);
      }
    }
    drawSkyline(far, 0.15, "#2a0f5c", C.purple, 150);
    drawSkyline(near, 0.35, "#16072f", C.magenta, 160);
  }
  function drawSkyline(sk, par, fill, edge, base) {
    const off = (cam * par) % 640;
    for (const b of sk.out) {
      for (const k of [0, 640]) {
        const x = Math.round(b.x - off + k);
        if (x > VW || x + b.w < 0) continue;
        const y = Math.round(base - b.h);
        ctx.fillStyle = fill; ctx.fillRect(x, y, Math.round(b.w), VH - y);
        ctx.fillStyle = edge; ctx.fillRect(x, y, Math.round(b.w), 1);
        ctx.fillRect(x, y, 1, base - y); ctx.fillRect(x + Math.round(b.w) - 1, y, 1, base - y);
        if (b.win > 0.4) {
          ctx.fillStyle = b.win > 0.75 ? C.cyan : C.yellow;
          for (let wy = y + 5; wy < base - 6; wy += 7) for (let wx = x + 4; wx < x + b.w - 4; wx += 6) {
            if (((wx * 7 + wy * 13) % 5) < 2) ctx.fillRect(wx, wy, 2, 2);
          }
        }
      }
    }
  }

  function drawTiles() {
    const x0 = Math.floor(cam / T), x1 = Math.min(COLS - 1, x0 + VW / T + 1);
    for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = grid[ty][tx];
      if (t === ".") continue;
      let x = Math.round(tx * T - cam), y = ty * T;
      const b = bumps.find((q) => q.tx === tx && q.ty === ty);
      if (b) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 5);
      if (t === "#") drawGround(x, y, tx, ty);
      else if (t === "B") drawBrick(x, y);
      else if (t === "?") drawQ(x, y);
      else if (t === "U") drawUsed(x, y);
      else if (t === "p") drawPipe(x, y, tx, ty);
    }
  }
  function drawGround(x, y, tx, ty) {
    ctx.fillStyle = "#14062e"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#2a0f5c";
    ctx.fillRect(x + 2, y + 2, 5, 5); ctx.fillRect(x + 9, y + 9, 5, 5);
    const open = (dx, dy) => !solid(tx + dx, ty + dy) || tileAt(tx + dx, ty + dy) !== "#";
    ctx.fillStyle = C.cyan;
    if (open(0, -1)) ctx.fillRect(x, y, T, 2);
    ctx.fillStyle = C.purple;
    if (open(-1, 0)) ctx.fillRect(x, y, 1, T);
    if (open(1, 0)) ctx.fillRect(x + T - 1, y, 1, T);
  }
  function drawBrick(x, y) {
    ctx.fillStyle = "#1e0a40"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = C.purple;
    ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y + T - 1, T, 1);
    ctx.fillRect(x, y + 7, T, 1);
    ctx.fillRect(x, y, 1, T); ctx.fillRect(x + T - 1, y, 1, T);
    ctx.fillRect(x + 7, y, 1, 7); ctx.fillRect(x + 3, y + 8, 1, 7); ctx.fillRect(x + 11, y + 8, 1, 7);
  }
  const Q = ["..YYYY..", ".YY..YY.", ".....YY.", "....YY..", "...YY...", "...YY...", "........", "...YY..."];
  function drawQ(x, y) {
    const pulse = Math.sin(frame * 0.12) > 0;
    ctx.fillStyle = "#2a1a00"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = pulse ? C.yellow : C.orange;
    ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x, y, 1, T); ctx.fillRect(x + T - 1, y, 1, T);
    ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 13, y + 2, 1, 1); ctx.fillRect(x + 2, y + 13, 1, 1); ctx.fillRect(x + 13, y + 13, 1, 1);
    ctx.fillStyle = C.yellow;
    Q.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "Y") ctx.fillRect(x + 4 + i, y + 4 + j, 1, 1); }));
  }
  function drawUsed(x, y) {
    ctx.fillStyle = "#1a1030"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = "#5a4a80";
    ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y + T - 1, T, 1); ctx.fillRect(x, y, 1, T); ctx.fillRect(x + T - 1, y, 1, T);
  }
  function drawPipe(x, y, tx, ty) {
    const left = tileAt(tx - 1, ty) !== "p";
    const isTop = tileAt(tx, ty - 1) !== "p";
    ctx.fillStyle = "#06240a"; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = C.lime;
    if (left) ctx.fillRect(x + 1, y, 1, T); else ctx.fillRect(x + T - 2, y, 1, T);
    ctx.fillRect(left ? x + 4 : x + 4, y, 2, T);
    if (isTop) {
      ctx.fillStyle = "#0b3a12"; ctx.fillRect(left ? x - 1 : x, y, T + 1, 7);
      ctx.fillStyle = C.lime;
      ctx.fillRect(left ? x - 1 : x, y, T + 1, 1); ctx.fillRect(left ? x - 1 : x, y + 6, T + 1, 1);
      if (left) ctx.fillRect(x - 1, y, 1, 7); else ctx.fillRect(x + T, y, 1, 7);
    }
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.taken) continue;
      const x = Math.round(c.x - cam);
      if (x < -16 || x > VW) continue;
      const ph = Math.abs(Math.sin(frame * 0.08 + c.x * 0.05));
      const w = Math.max(1, Math.round(8 * ph));
      ctx.fillStyle = C.yellow;
      ctx.fillRect(x + 4 - (w >> 1), c.y + 1, w, 10);
      ctx.fillRect(x + 4 - (w >> 1) + (w > 2 ? 1 : 0), c.y, Math.max(1, w - 2), 12);
      if (w > 4) { ctx.fillStyle = C.orange; ctx.fillRect(x + 3, c.y + 3, 2, 6); }
    }
  }

  function drawFlag() {
    const x = Math.round(flagX - cam) + 7;
    if (x < -40 || x > VW + 20) return;
    ctx.fillStyle = C.cyan; ctx.fillRect(x, 2 * T, 2, 8 * T);
    ctx.fillStyle = C.white; ctx.fillRect(x - 2, 2 * T - 5, 6, 6);
    const wave = Math.round(Math.sin(frame * 0.15) * 1.5);
    const fy = state === "win" ? Math.min(8 * T, 2 * T + 4 + stateT * 2) : 2 * T + 4;
    ctx.fillStyle = C.magenta;
    for (let i = 0; i < 14; i++) {
      const h = 10 - Math.floor(i * 0.6);
      ctx.fillRect(x - 1 - i, fy + Math.round(Math.sin(i * 0.5 + frame * 0.15) * 1) + wave * 0 + (10 - h) / 2, 1, h);
    }
    // castillo neón
    const cx = Math.round(flagX + 4 * T - cam);
    ctx.fillStyle = "#14062e"; ctx.fillRect(cx, 6 * T, 4 * T, 4 * T);
    ctx.fillStyle = C.magenta;
    ctx.fillRect(cx, 6 * T, 4 * T, 1); ctx.fillRect(cx, 6 * T, 1, 4 * T); ctx.fillRect(cx + 4 * T - 1, 6 * T, 1, 4 * T);
    for (let i = 0; i < 4; i++) { ctx.fillRect(cx + i * 16 + 2, 6 * T - 6, 10, 1); ctx.fillRect(cx + i * 16 + 2, 6 * T - 6, 1, 6); ctx.fillRect(cx + i * 16 + 11, 6 * T - 6, 1, 6); }
    ctx.fillStyle = C.cyan; ctx.fillRect(cx + 24, 8 * T, 16, 2 * T); ctx.fillStyle = "#07021a"; ctx.fillRect(cx + 25, 8 * T + 1, 14, 2 * T - 1);
  }

  function drawEnemies() {
    for (const e of enemies) {
      if (!e.active && !(state === "title")) continue;
      const x = Math.round(e.x - cam);
      if (x < -20 || x > VW + 20) continue;
      if (e.alive) {
        ctx.drawImage(ENEMY[Math.floor(frame / 10) % 2], x, Math.round(e.y));
      } else if (e.flip && e.y < VH) {
        ctx.save(); ctx.translate(x, Math.round(e.y) + 12); ctx.scale(1, -1); ctx.drawImage(ENEMY[0], 0, 0); ctx.restore();
      } else if (e.flat > 0) {
        ctx.drawImage(ENEMY_FLAT, x, Math.round(e.y) + 8);
      }
    }
  }

  function drawPlayer() {
    const p = player;
    if (p.inv > 0 && frame % 4 < 2) return;
    if (state === "win" && p.x >= flagX + 4 * T + 26) return; // entró al castillo
    let img = PLAYER.idle;
    if (state === "dying") img = PLAYER.dead;
    else if (!p.onGround && state !== "win") img = PLAYER.jump;
    else if (Math.abs(p.vx) > 0.2 || state === "win") img = Math.floor(p.anim) % 2 ? PLAYER.run1 : PLAYER.run2;
    const x = Math.round(p.x - cam) - 1, y = Math.round(p.y) - 1;
    if (p.face < 0) { ctx.save(); ctx.translate(x + 12, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
    else ctx.drawImage(img, x, y);
  }

  function drawFx() {
    for (const p of particles) { ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x - cam), Math.round(p.y), 2, 2); }
    for (const p of popups) {
      const x = Math.round(p.x - cam), y = Math.round(p.y);
      if (p.kind === "coin") { ctx.fillStyle = C.yellow; ctx.fillRect(x + 1, y, 6, 12); }
      else text(p.text, x, y, C.white, 8);
    }
  }

  let fontReady = false;
  if (document.fonts && document.fonts.load) document.fonts.load('8px "Press Start 2P"').then(() => { fontReady = true; }).catch(() => {});
  function text(str, x, y, col, size = 8, align = "left") {
    ctx.font = `${size}px ${fontReady ? '"Press Start 2P"' : "monospace"}`;
    ctx.textAlign = align; ctx.textBaseline = "top";
    ctx.fillStyle = col; ctx.fillText(str, Math.round(x), Math.round(y));
  }
  const pad = (n, l) => String(n).padStart(l, "0");

  function drawHud() {
    text("PUNTOS", 8, 6, C.cyan); text(pad(score, 6), 8, 16, C.white);
    text("x" + pad(coinCount, 2), 96, 16, C.yellow);
    ctx.fillStyle = C.yellow; ctx.fillRect(88, 15, 5, 9);
    text("VIDAS", 150, 6, C.magenta); text(String(lives), 166, 16, C.white);
    text("TIEMPO", 248, 6, C.lime); text(pad(time, 3), 264, 16, C.white);
  }

  function drawOverlay() {
    if (state === "title") {
      ctx.fillStyle = "rgba(7,2,26,0.55)"; ctx.fillRect(0, 0, VW, VH);
      text("NEÓN", VW / 2, 34, C.cyan, 24, "center");
      text("BROS", VW / 2, 62, C.magenta, 24, "center");
      if (Math.floor(frame / 30) % 2 === 0) text(isTouch ? "TOCA PARA JUGAR" : "PULSA ESPACIO", VW / 2, 110, C.yellow, 8, "center");
      text(isTouch ? "BOTONES: MOVER Y SALTAR" : "FLECHAS: MOVER   ESPACIO: SALTAR", VW / 2, 132, C.white, 8, "center");
      text("PISA A LOS GLITCH. LLEGA A LA BANDERA.", VW / 2, 148, "#b9a8ff", 8, "center");
      if (best) text("RÉCORD " + pad(best, 6), VW / 2, 170, C.lime, 8, "center");
    } else if (state === "over") {
      ctx.fillStyle = "rgba(7,2,26,0.75)"; ctx.fillRect(0, 0, VW, VH);
      text("FIN DEL JUEGO", VW / 2, 70, C.magenta, 16, "center");
      text("PUNTOS " + pad(score, 6), VW / 2, 100, C.white, 8, "center");
      if (Math.floor(frame / 30) % 2 === 0) text(isTouch ? "TOCA PARA REINTENTAR" : "ESPACIO PARA REINTENTAR", VW / 2, 130, C.yellow, 8, "center");
    } else if (state === "win" && stateT > 90) {
      ctx.fillStyle = "rgba(7,2,26,0.6)"; ctx.fillRect(0, 50, VW, 84);
      text("¡NIVEL SUPERADO!", VW / 2, 64, C.lime, 16, "center");
      text("PUNTOS " + pad(score, 6) + "   RÉCORD " + pad(best, 6), VW / 2, 92, C.white, 8, "center");
      if (Math.floor(frame / 30) % 2 === 0) text(isTouch ? "TOCA PARA JUGAR OTRA VEZ" : "ESPACIO PARA JUGAR OTRA VEZ", VW / 2, 114, C.yellow, 8, "center");
    }
  }
  const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;

  function render() {
    ctx.imageSmoothingEnabled = false;
    drawBackground();
    drawTiles();
    drawCoins();
    drawFlag();
    drawEnemies();
    if (state !== "title") drawPlayer();
    drawFx();
    if (state !== "title") drawHud();
    drawOverlay();
    // líneas de escaneo
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    for (let y = 0; y < VH; y += 2) ctx.fillRect(0, y, VW, 1);

    // composición a pantalla con brillo neón
    sctx.fillStyle = C.bg0; sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(buf, view.x, view.y, VW * view.s, VH * view.s);
    if (canBlur) {
      gctx.clearRect(0, 0, VW, VH);
      gctx.filter = "blur(3px)";
      gctx.drawImage(buf, 0, 0);
      gctx.filter = "none";
      sctx.save();
      sctx.globalCompositeOperation = "lighter";
      sctx.globalAlpha = 0.55;
      sctx.imageSmoothingEnabled = true;
      sctx.drawImage(glow, view.x, view.y, VW * view.s, VH * view.s);
      sctx.restore();
    }
  }

  /* ---------- Bucle ---------- */
  buildLevel();
  resetPlayer();
  frame = 0; stateT = 0; score = 0; coinCount = 0; lives = 3; particles = []; popups = []; bumps = [];
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 100);
    last = now;
    while (acc >= STEP) {
      if (state === "title") { frame++; cam = (cam + 0.5) % (COLS * T - VW); }
      else update();
      acc -= STEP;
    }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
