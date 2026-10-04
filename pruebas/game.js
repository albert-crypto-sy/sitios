/* Lila la unicornia — un juego tierno y muy fácil para peques. Sin dependencias.
   Tres pantallas: el camino al castillo (plataformas), el laberinto de las zanahorias (al entrar en el
   castillo Lila se convierte en conejita) y la merienda en las nubes.
   No se pierde nunca: si Lila cae, una nube la devuelve arriba. No hay enemigos ni tiempo. */
(() => {
  "use strict";

  const VH = 720;          // alto del mundo en unidades
  const T = 60;            // tamaño de casilla
  const TAU = Math.PI * 2;
  const STEP = 1000 / 60;
  const INK = "#5b4370";
  const P = {
    lilac: "#c9a7f5", lilac2: "#b48cf0", pink: "#ffb6d9", pink2: "#ff8cc6", hot: "#ff5fa8",
    mint: "#a8e6cf", mint2: "#7fd8b4", cream: "#fff3e3", yellow: "#ffd84d", gold: "#ffd86b",
    sky1: "#bfe3ff", sky2: "#ffe3f3", white: "#ffffff", peach: "#ffd6b8", blue: "#a9d8ff",
  };

  const screen = document.getElementById("screen");
  const ctx = screen.getContext("2d");
  let W = 0, H = 0, scale = 1, viewW = 0, viewH = 0, offY = 0, portrait = false;
  const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!innerWidth || !innerHeight) return;  // ventana aún sin tamaño: se espera al siguiente resize
    W = screen.width = Math.round(innerWidth * dpr);
    H = screen.height = Math.round(innerHeight * dpr);
    portrait = H > W;
    scale = Math.min(H / VH, W / (portrait ? 560 : 900));
    viewW = W / scale; viewH = H / scale;
    // en vertical sobra cielo arriba; con botones táctiles, el suelo queda por encima de ellos
    // (en el laberinto la cruceta es más alta)
    const reserve = isTouch && portrait ? ((state === "maze" ? 270 : 150) * dpr) / scale : 0;
    offY = viewH - VH - reserve;
  }
  addEventListener("resize", resize);

  /* ---------- Nivel ---------- */
  const ground = [];   // sólidos
  const clouds = [];   // plataformas de nube (se atraviesan desde abajo)
  const springs = [];
  let items = [];
  const END = 156 * T;
  const CASTLE = 146 * T;

  function buildLevel() {
    ground.length = 0; clouds.length = 0; springs.length = 0; items = [];
    const g = (a, b, row) => ground.push({ x: a * T, y: row * T, w: (b - a) * T, h: 2000 });
    const c = (x, row, w) => clouds.push({ x: x * T, y: row * T, w: w * T, h: 24 });
    const s = (x, row = 10) => springs.push({ x: x * T + 6, y: row * T - 34, w: 48, h: 34, squash: 0 });
    const star = (x, row) => items.push({ kind: "star", x: x * T + T / 2, y: row * T + T / 2, taken: false, ph: Math.random() * TAU });
    const heart = (x, row) => items.push({ kind: "heart", x: x * T + T / 2, y: row * T + T / 2, taken: false, ph: Math.random() * TAU });
    const arc = (x0, x1, row, lift) => {
      for (let x = x0; x <= x1; x++) {
        const k = (x - x0) / Math.max(1, x1 - x0);
        star(x, row - Math.round(Math.sin(k * Math.PI) * lift));
      }
    };

    g(0, 14, 10); g(14, 20, 9); g(20, 26, 10);
    g(28, 40, 10); g(40, 46, 9); g(46, 52, 8); g(52, 58, 9);
    g(60, 75, 10); g(78, 92, 10); g(92, 98, 9); g(98, 110, 10);
    g(113, 130, 10); g(130, 140, 9); g(140, END / T, 10);

    c(8, 7, 3); c(22, 6.5, 3); c(33, 7, 3); c(37.5, 4.5, 3); c(64, 7, 4); c(70, 4.5, 3);
    c(75.3, 8, 2.4); c(84, 7, 3); c(88.5, 4.5, 3); c(102, 7, 3); c(118, 7, 3); c(122.5, 4.5, 4); c(132, 6, 3);

    s(31); s(67); s(107); s(126);

    arc(3, 7, 9, 0); star(9, 6); star(10, 6);
    arc(15, 19, 8, 0); star(23, 5.5); star(24, 5.5);
    arc(25, 29, 9, 2); star(34, 6); star(35, 6); heart(38.5, 3.5);
    arc(41, 45, 8, 0); arc(47, 51, 7, 0); arc(56, 61, 8, 2);
    star(65, 6); star(66, 6); star(67, 6); heart(71, 3.5); star(67, 4); star(67, 3);
    arc(74, 78, 7, 1); star(85, 6); star(86, 6); heart(89.5, 3.5);
    arc(93, 97, 8, 0); star(103, 6); star(104, 6); star(107, 4); star(107, 3);
    arc(109, 114, 8, 2); star(119, 6); star(120, 6); heart(124, 3.5); star(126, 4); star(126, 3);
    arc(133, 135, 5, 0); arc(136, 142, 8, 1);
  }

  /* ---------- Entrada ---------- */
  const keys = { left: false, right: false, up: false, down: false, jump: false };
  let jumpBuffer = 0;
  const KEYMAP = {
    ArrowLeft: ["left"], KeyA: ["left"], ArrowRight: ["right"], KeyD: ["right"],
    ArrowUp: ["up", "jump"], KeyW: ["up", "jump"], ArrowDown: ["down"], KeyS: ["down"],
    Space: ["jump"], KeyZ: ["jump"],
  };
  addEventListener("keydown", (e) => {
    const ks = KEYMAP[e.code];
    if (ks) {
      e.preventDefault();
      for (const k of ks) {
        if (k === "jump" && !keys.jump) jumpBuffer = 8;
        keys[k] = true;
      }
    }
    if (e.code === "Space" || e.code === "Enter") tapStart();
    unlockAudio();
  });
  addEventListener("keyup", (e) => { const ks = KEYMAP[e.code]; if (ks) for (const k of ks) keys[k] = false; });

  document.querySelectorAll(".touch button").forEach((b) => {
    const k = b.dataset.key;
    const on = (e) => {
      e.preventDefault();
      if (k === "jump" && !keys.jump) jumpBuffer = 8;
      keys[k] = true; b.classList.add("on");
      unlockAudio(); tapStart();
    };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("pointerleave", off);
  });
  screen.addEventListener("pointerdown", () => { unlockAudio(); tapStart(); });

  /* ---------- Sonidos suaves y musiquita ---------- */
  let ac = null, muted = false;
  const muteBtn = document.getElementById("mute");
  muteBtn.addEventListener("click", () => {
    muted = !muted; muteBtn.textContent = muted ? "🔇" : "🔊"; unlockAudio();
    if (musicBus) musicBus.gain.setValueAtTime(muted ? 0 : 1, ac.currentTime);
  });
  function unlockAudio() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* sin audio */ } }
    if (ac && ac.state === "suspended") ac.resume();
  }
  function tone(f0, f1, dur, vol = 0.08, delay = 0, type = "sine") {
    if (!ac || muted) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sfx = {
    jump: () => tone(420, 760, 0.18, 0.07),
    star: () => { tone(1046, 1046, 0.1, 0.06); tone(1568, 1568, 0.18, 0.05, 0.08); },
    heart: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.14, 0.05, i * 0.07)),
    boing: () => tone(220, 880, 0.3, 0.09, 0, "triangle"),
    rescue: () => [880, 784, 988].forEach((f, i) => tone(f, f * 1.01, 0.16, 0.05, i * 0.1)),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.22, 0.06, i * 0.13, "triangle")),
    magic: () => [523, 587, 659, 784, 880, 1046, 1175, 1318, 1568, 1760].forEach((f, i) => { tone(f, f * 1.02, 0.3, 0.04, i * 0.08); tone(f * 2, f * 2, 0.12, 0.015, i * 0.08 + 0.04); }),
    poof: () => { tone(300, 900, 0.25, 0.07, 0, "triangle"); tone(1568, 2093, 0.4, 0.04, 0.15); },
    hop: () => tone(700, 1050, 0.05, 0.018),
    carrot: () => { tone(520, 400, 0.07, 0.06, 0, "triangle"); tone(540, 410, 0.07, 0.06, 0.11, "triangle"); tone(1318, 1318, 0.16, 0.04, 0.22); },
    gate: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.2, 0.05, i * 0.09, "triangle")),
    balloon: () => { tone(300, 620, 0.7, 0.05); tone(880, 1318, 0.5, 0.03, 0.3); },
    yum: () => { tone(620, 1400, 0.09, 0.06); tone(1760, 1760, 0.12, 0.035, 0.07); },
    plop: () => tone(500, 260, 0.12, 0.035),
  };

  // Música: una melodía de cajita de música por pantalla, programada con un poco de antelación.
  const SONGS = {
    meadow: { bpm: 116, lead: [72, 76, 79, 76, 81, 79, 76, 0, 77, 81, 79, 77, 76, 0, 74, 0, 72, 76, 79, 84, 83, 79, 81, 0, 79, 77, 76, 74, 72, 0, 0, 0], bass: [48, 45, 41, 43, 48, 43, 43, 48] },
    maze: { bpm: 100, lead: [77, 81, 84, 81, 79, 0, 76, 0, 74, 77, 81, 77, 76, 0, 72, 0, 77, 81, 84, 86, 84, 81, 79, 0, 81, 79, 77, 76, 77, 0, 0, 0], bass: [41, 36, 38, 36, 41, 34, 36, 41] },
    sky: { bpm: 124, lead: [79, 83, 86, 83, 84, 81, 76, 81, 79, 83, 86, 91, 88, 86, 84, 81, 83, 84, 86, 84, 81, 79, 78, 81, 79, 0, 83, 0, 79, 0, 0, 0], bass: [43, 48, 43, 48, 43, 38, 43, 43] },
  };
  SONGS.party = { ...SONGS.meadow, bpm: 140 };
  let song = null, songStep = 0, nextNoteT = 0, musicBus = null;
  function playSong(name) {
    const next = name ? SONGS[name] : null;
    if (next === song) return;
    song = next; songStep = 0; nextNoteT = 0;
  }
  function note(midi, t, dur, type, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function musicTick() {
    if (!ac || !song || ac.state !== "running") return;
    if (!musicBus) { musicBus = ac.createGain(); musicBus.gain.value = muted ? 0 : 1; musicBus.connect(ac.destination); }
    const stepDur = 60 / song.bpm / 2;
    if (nextNoteT < ac.currentTime) nextNoteT = ac.currentTime + 0.05;
    while (nextNoteT < ac.currentTime + 0.25) {
      const n = song.lead[songStep % song.lead.length];
      if (n) { note(n, nextNoteT, stepDur * 1.6, "triangle", 0.035); note(n + 12, nextNoteT, stepDur * 0.8, "sine", 0.012); }
      const b = song.bass[((songStep / 4) | 0) % song.bass.length];
      if (songStep % 4 === 0) note(b, nextNoteT, stepDur * 1.8, "sine", 0.05);
      if (songStep % 4 === 2) note(b + 12, nextNoteT, stepDur * 1.2, "sine", 0.025);
      nextNoteT += stepDur; songStep++;
    }
  }

  /* ---------- Estado ---------- */
  let state = "title";  // title | play | magic | maze | sky | end
  let lila, cam, stars, hearts, totalStars, particles, frame = 0, stateT = 0, rescue = 0, confetti = [];
  let carrots = 0, sweets = 0;
  let fade = null;     // fundido entre pantallas: { t, mid }

  function setStage(name) {
    state = name; stateT = 0;
    document.body.dataset.stage = name;
    resize();
  }
  function fadeTo(mid) { if (!fade) fade = { t: 0, mid }; }
  function updateFade() {
    if (!fade) return;
    fade.t++;
    if (fade.t === 30) fade.mid();
    if (fade.t >= 60) fade = null;
  }

  function newGame() {
    buildLevel();
    lila = { x: 2 * T, y: 10 * T - 64, w: 64, h: 64, vx: 0, vy: 0, onGround: false, face: 1, walk: 0, coyote: 0, safeX: 2 * T, safeY: 10 * T - 64, squash: 0, blink: 120 };
    cam = 0; stars = 0; hearts = 0; carrots = 0; sweets = 0; particles = []; confetti = [];
    totalStars = items.filter((i) => i.kind === "star").length;
    setStage("play"); rescue = 0; bunnyForm = false; fade = null;
    playSong("meadow");
  }
  function tapStart() {
    if (state === "title" || (state === "end" && stateT > 120 && !fade)) newGame();
  }

  /* ---------- Física ---------- */
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function update() {
    frame++; stateT++;
    updateParticles();
    updateFade();
    if (state === "title") { cam += 1.2; if (cam > END - viewW) cam = 0; return; }
    if (state === "magic") { updateMagic(); return; }
    if (state === "maze") { updateMaze(); return; }
    if (state === "sky" || state === "end") { updateSkyStage(); return; }

    const L = lila;
    if (rescue > 0) {
      // la nube baja a Lila con calma
      rescue--;
      L.y += (L.safeY - L.y) * 0.08;
      L.x += (L.safeX - L.x) * 0.08;
      if (rescue === 0) { L.y = L.safeY; L.x = L.safeX; L.vy = 0; }
      followCam();
      return;
    }

    const maxV = 5.2;
    if (keys.left && !keys.right) { L.vx = Math.max(L.vx - 0.5, -maxV); L.face = -1; }
    else if (keys.right && !keys.left) { L.vx = Math.min(L.vx + 0.5, maxV); L.face = 1; }
    else { L.vx *= 0.82; if (Math.abs(L.vx) < 0.1) L.vx = 0; }

    if (L.onGround) L.coyote = 8; else if (L.coyote > 0) L.coyote--;
    if (jumpBuffer > 0) jumpBuffer--;
    if (jumpBuffer > 0 && L.coyote > 0) {
      L.vy = -17; L.coyote = 0; jumpBuffer = 0; L.onGround = false; sfx.jump();
      for (let i = 0; i < 6; i++) sparkle(L.x + L.w / 2, L.y + L.h, P.lilac);
    }
    // si se suelta el salto antes, sube un poco menos (control suave)
    if (!keys.jump && L.vy < -8) L.vy += 0.6;
    L.vy = Math.min(L.vy + 0.8, 15);

    // horizontal
    L.x += L.vx;
    if (L.x < 0) { L.x = 0; L.vx = 0; }
    if (L.x + L.w > END) { L.x = END - L.w; L.vx = 0; }
    for (const s of ground) {
      if (overlap(L, s)) {
        if (L.vx > 0) L.x = s.x - L.w; else if (L.vx < 0) L.x = s.x + s.w;
        else L.x = L.x + L.w / 2 < s.x + s.w / 2 ? s.x - L.w : s.x + s.w;
        L.vx = 0;
      }
    }
    // vertical
    const prevBottom = L.y + L.h;
    L.y += L.vy;
    const wasOnGround = L.onGround;
    L.onGround = false;
    for (const s of ground) {
      if (overlap(L, s)) {
        if (L.vy > 0) { L.y = s.y - L.h; L.vy = 0; L.onGround = true; L.safeX = L.x; L.safeY = L.y; }
        else if (L.vy < 0) { L.y = s.y + s.h; L.vy = 0; }
      }
    }
    if (L.vy >= 0) {
      for (const c of clouds) {
        if (L.x + L.w > c.x + 6 && L.x < c.x + c.w - 6 && prevBottom <= c.y + 1 && L.y + L.h >= c.y) {
          L.y = c.y - L.h; L.vy = 0; L.onGround = true;
        }
      }
    }
    if (L.onGround && !wasOnGround) { L.squash = 8; }
    if (L.squash > 0) L.squash--;

    // muelles: salto enorme
    for (const s of springs) {
      if (s.squash > 0) s.squash--;
      // salta al pisarla o al chocar con ella andando: más fácil para peques
      if (L.vy >= 0 && overlap(L, s) && (prevBottom <= s.y + 12 || L.onGround)) {
        L.y = s.y - L.h; L.vy = -25; L.onGround = false; L.coyote = 0;
        s.squash = 14; sfx.boing();
        for (let i = 0; i < 10; i++) sparkle(s.x + 24, s.y, P.pink2);
      }
    }

    // estrellas y corazones
    const hb = { x: L.x - 8, y: L.y - 12, w: L.w + 16, h: L.h + 16 };
    for (const it of items) {
      if (it.taken) continue;
      if (Math.abs(it.x - (hb.x + hb.w / 2)) < hb.w / 2 + 18 && Math.abs(it.y - (hb.y + hb.h / 2)) < hb.h / 2 + 18) {
        it.taken = true;
        if (it.kind === "star") { stars++; sfx.star(); for (let i = 0; i < 8; i++) sparkle(it.x, it.y, P.yellow); }
        else { hearts++; sfx.heart(); for (let i = 0; i < 12; i++) sparkle(it.x, it.y, P.pink2, true); }
      }
    }

    // estela de arcoíris al correr o saltar
    if ((Math.abs(L.vx) > 3 || !L.onGround) && frame % 3 === 0) {
      const cols = [P.pink, P.peach, P.yellow, P.mint, P.blue, P.lilac];
      particles.push({ x: L.x + (L.face > 0 ? 6 : L.w - 6), y: L.y + 22 + (frame % 18), vx: -L.face * 0.4, vy: 0.2, life: 30, max: 30, col: cols[(frame / 3) % 6 | 0], r: 6, kind: "dot" });
    }

    L.walk += Math.abs(L.vx) * 0.06;
    if (--L.blink < 0) L.blink = 160 + Math.random() * 120;

    // caída: la nube la rescata
    if (L.y > VH + 120) {
      rescue = 70; L.vx = 0; L.vy = 0; L.y = -120 - offY; sfx.rescue();
    }

    // castillo: Lila entra y se convierte en conejita
    if (L.x > CASTLE - T) {
      setStage("magic"); playSong(null); sfx.win();
      L.vy = 0; L.squash = 0;
      for (let i = 0; i < 60; i++) confetti.push(newConfetti(true));
    }
    followCam();
  }

  function followCam() {
    const target = lila.x + lila.w / 2 - viewW * 0.4;
    cam += (target - cam) * 0.12;
    cam = Math.max(0, Math.min(cam, END - viewW));
  }

  // Transformación a la puerta del castillo: chispas, destello y... ¡conejita!
  const DOOR = CASTLE + 170;
  let bunnyForm = false;
  function updateMagic() {
    const L = lila;
    const t = stateT;
    if (t < 70) {
      // camina hasta la puerta
      L.vx = Math.min(3, (DOOR - L.w / 2 - L.x) * 0.06); L.x += L.vx; L.face = 1; L.walk += Math.abs(L.vx) * 0.06;
      L.y = 10 * T - L.h; L.onGround = true;
    } else {
      L.vx = 0;
      L.y = 10 * T - L.h - Math.min(40, (t - 70) * 0.8) + (bunnyForm ? Math.abs(Math.sin(t * 0.15)) * -18 : 0);
    }
    if (t === 70) sfx.magic();
    if (t >= 70 && t < 140 && frame % 2 === 0) {
      const a = t * 0.3, cx = L.x + L.w / 2, cy = L.y + L.h / 2;
      const cols = [P.pink2, P.lilac2, P.yellow, P.mint2, P.blue];
      particles.push({ x: cx + Math.cos(a) * 70, y: cy + Math.sin(a) * 70, vx: -Math.cos(a) * 1.5, vy: -Math.sin(a) * 1.5, life: 30, max: 30, col: cols[t % 5], r: 8, kind: "star", rot: a });
    }
    if (t === 140) {
      bunnyForm = true; sfx.poof();
      for (let i = 0; i < 24; i++) sparkle(L.x + L.w / 2, L.y + L.h / 2, i % 2 ? P.pink2 : P.white, i % 3 === 0);
    }
    if (t === 260) fadeTo(startMaze);
    followCam();
  }

  function sparkle(x, y, col, heart) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 40, max: 40, col, r: 6 + Math.random() * 6, kind: heart ? "heart" : "star", rot: Math.random() * TAU });
  }
  function newConfetti(burst) {
    const cols = [P.pink2, P.lilac2, P.yellow, P.mint2, P.blue, P.hot];
    return {
      x: cam + Math.random() * viewW, y: burst ? -offY - Math.random() * 300 : -offY - 20,
      vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5,
      rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.2,
      col: cols[(Math.random() * cols.length) | 0], heart: Math.random() < 0.3, life: 400,
    };
  }
  function updateParticles() {
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += p.kind === "dot" ? 0 : 0.15; p.life--; if (p.rot !== undefined) p.rot += 0.1; }
    particles = particles.filter((p) => p.life > 0);
    for (const c of confetti) { c.x += c.vx + Math.sin((frame + c.rot * 50) * 0.05) * 0.8; c.y += c.vy; c.rot += c.vr; c.life--; }
    confetti = confetti.filter((c) => c.life > 0 && c.y < VH + 40);
  }

  /* ---------- Dibujo: utilidades ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function outline(w = 4) { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke(); }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function starPath(x, y, r, rot = -Math.PI / 2) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? r * 0.5 : r;
      const a = rot + (i * Math.PI) / 5;
      ctx[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }
  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y + s * 0.1, x - s * 0.8, y - s * 1.0, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.8, y - s * 1.0, x + s * 1.4, y + s * 0.1, x, y + s * 0.9);
    ctx.closePath();
  }
  function face(x, y, s, happy = true) {
    ctx.fillStyle = INK;
    circle(x - s * 0.35, y, s * 0.12); ctx.fill();
    circle(x + s * 0.35, y, s * 0.12); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + s * 0.12, s * 0.18, 0.15 * Math.PI, (happy ? 0.85 : 0.15) * Math.PI); ctx.lineWidth = s * 0.08; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = "rgba(255,140,198,0.6)";
    ctx.beginPath(); ctx.ellipse(x - s * 0.6, y + s * 0.2, s * 0.16, s * 0.1, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.6, y + s * 0.2, s * 0.16, s * 0.1, 0, 0, TAU); ctx.fill();
  }

  /* ---------- Fondo ---------- */
  const bgClouds = Array.from({ length: 9 }, (_, i) => ({ x: i * 420 + Math.random() * 200, y: 60 + Math.random() * 220, s: 0.7 + Math.random() * 0.6 }));
  function drawSky() {
    const g = ctx.createLinearGradient(0, -offY, 0, VH);
    g.addColorStop(0, P.sky1); g.addColorStop(0.75, P.sky2); g.addColorStop(1, "#fff0e6");
    ctx.fillStyle = g;
    ctx.fillRect(0, -offY, viewW, viewH);

    // sol sonriente
    const sx = viewW - 140, sy = 120;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(frame * 0.004);
    ctx.fillStyle = "#ffe89a";
    for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); rr(-7, -88, 14, 26, 7); ctx.fill(); }
    ctx.restore();
    circle(sx, sy, 56); ctx.fillStyle = P.yellow; ctx.fill(); outline(4);
    face(sx, sy, 40);

    // arcoíris lejano
    const rx = 900 - (cam * 0.08) % 3000;
    const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
    ctx.lineWidth = 16;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(rx, 520, 300 - i * 16, Math.PI, TAU); ctx.stroke(); });
    ctx.globalAlpha = 1;

    // nubes del fondo
    for (const c of bgClouds) {
      const x = ((c.x - cam * 0.15 + frame * 0.15) % 3600 + 3600) % 3600 - 300;
      if (x > viewW + 200) continue;
      puff(x, c.y, 110 * c.s, 0.85);
    }

    // colinas
    hills(0.2, 470, 70, "#e6d6ff", 0.004);
    hills(0.4, 540, 50, "#c9f0dd", 0.006);
  }
  function hills(par, base, amp, col, freq) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, VH + 900);
    for (let x = 0; x <= viewW + 20; x += 20) {
      const wx = x + cam * par;
      ctx.lineTo(x, base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3) * amp * 0.4);
    }
    ctx.lineTo(viewW, VH + 900);
    ctx.closePath();
    ctx.fill();
  }
  function puff(x, y, w, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = P.white;
    const r = w * 0.28;
    ctx.beginPath();
    ctx.arc(x + r, y, r, 0, TAU);
    ctx.arc(x + w * 0.5, y - r * 0.6, r * 1.25, 0, TAU);
    ctx.arc(x + w - r, y, r, 0, TAU);
    ctx.fill();
    rr(x + r * 0.2, y - r * 0.2, w - r * 0.4, r * 1.2, r * 0.6); ctx.fill();
    ctx.globalAlpha = 1;
  }

  /* ---------- Mundo ---------- */
  function drawGround() {
    for (const s of ground) {
      const x = s.x - cam;
      if (x > viewW + 20 || x + s.w < -20) continue;
      // tierra de galleta
      rr(x, s.y, s.w, VH - s.y + 900, 22);
      ctx.fillStyle = P.cream; ctx.fill(); outline(4);
      ctx.fillStyle = "#ffd9b8";
      for (let gx = Math.ceil(s.x / 50) * 50; gx < s.x + s.w - 20; gx += 50) {
        for (let gy = s.y + 70; gy < VH + 400; gy += 55) {
          const o = ((gx / 50) % 2) * 25;
          circle(gx - cam + o + 10, gy, 6); ctx.fill();
        }
      }
      // césped menta con borde ondulado
      ctx.fillStyle = P.mint;
      ctx.beginPath();
      ctx.moveTo(x + 22, s.y);
      ctx.lineTo(x + s.w - 22, s.y);
      ctx.arcTo(x + s.w, s.y, x + s.w, s.y + 22, 22);
      ctx.lineTo(x + s.w, s.y + 26);
      const n = Math.max(2, Math.round(s.w / 30));
      const step = s.w / n;
      for (let i = n; i > 0; i--) {
        ctx.arc(x + (i - 0.5) * step, s.y + 26, step / 2, 0, Math.PI, false);
      }
      ctx.lineTo(x, s.y + 22);
      ctx.arcTo(x, s.y, x + 22, s.y, 22);
      ctx.closePath();
      ctx.fill(); outline(4);
      // florecitas
      for (let fx = s.x + 40; fx < s.x + s.w - 30; fx += 170) {
        flower(fx - cam + ((fx * 7) % 60), s.y - 4, (fx / 170) % 3 | 0);
      }
    }
  }
  function flower(x, y, k) {
    const col = [P.pink, P.lilac, P.yellow][k];
    ctx.strokeStyle = P.mint2; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 18); ctx.stroke();
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + frame * 0.01; circle(x + Math.cos(a) * 8, y - 24 + Math.sin(a) * 8, 6); ctx.fill(); }
    circle(x, y - 24, 5); ctx.fillStyle = "#fff6a8"; ctx.fill();
  }
  function drawClouds() {
    for (const c of clouds) {
      const x = c.x - cam;
      if (x > viewW + 40 || x + c.w < -40) continue;
      const bob = Math.sin(frame * 0.03 + c.x) * 2;
      const r = 20;
      ctx.beginPath();
      const n = Math.max(2, Math.round(c.w / 40));
      for (let i = 0; i < n; i++) {
        const cx = x + r + (i * (c.w - 2 * r)) / (n - 1);
        ctx.moveTo(cx + r * 1.2, c.y + 6 + bob);
        ctx.arc(cx, c.y + 6 + bob, r * 1.2, 0, TAU);
      }
      ctx.fillStyle = P.white; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      // tapa la línea interior para que parezca una sola nube
      rr(x + 8, c.y - 4 + bob, c.w - 16, 30, 14); ctx.fillStyle = P.white; ctx.fill();
      face(x + c.w / 2, c.y + 12 + bob, 18);
    }
  }
  function drawSprings() {
    for (const s of springs) {
      const x = s.x - cam;
      if (x > viewW + 40 || x + s.w < -40) continue;
      const sq = s.squash > 0 ? Math.sin((s.squash / 14) * Math.PI) * 10 : 0;
      // tallo
      rr(x + 14, s.y + 12 + sq, 20, 22 - sq, 8); ctx.fillStyle = P.cream; ctx.fill(); outline(4);
      // sombrero de seta
      ctx.beginPath();
      ctx.ellipse(x + 24, s.y + 14 + sq, 34 + sq * 0.6, 22 - sq * 0.5, 0, Math.PI, TAU);
      ctx.closePath();
      ctx.fillStyle = P.pink2; ctx.fill(); outline(4);
      ctx.fillStyle = P.white;
      circle(x + 10, s.y + 2 + sq, 5); ctx.fill();
      circle(x + 26, s.y - 4 + sq, 6); ctx.fill();
      circle(x + 40, s.y + 4 + sq, 4); ctx.fill();
    }
  }
  function drawItems() {
    for (const it of items) {
      if (it.taken) continue;
      const x = it.x - cam;
      if (x < -40 || x > viewW + 40) continue;
      const y = it.y + Math.sin(frame * 0.06 + it.ph) * 5;
      if (it.kind === "star") {
        starPath(x, y, 22, -Math.PI / 2 + Math.sin(frame * 0.04 + it.ph) * 0.15);
        ctx.fillStyle = P.yellow; ctx.fill(); outline(3.5);
        face(x, y + 2, 13);
      } else {
        const s = 18 + Math.sin(frame * 0.12 + it.ph) * 2;
        heartPath(x, y, s);
        ctx.fillStyle = P.hot; ctx.fill(); outline(3.5);
        circle(x - s * 0.4, y - s * 0.3, s * 0.15); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
      }
    }
  }
  function drawCastle() {
    const x = CASTLE - cam;
    if (x > viewW + 50 || x < -500) return;
    const base = 10 * T;
    // arcoíris detrás
    const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
    ctx.lineWidth = 20;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x + 160, base, 300 - i * 20, Math.PI, TAU); ctx.stroke(); });
    // torres
    const tower = (tx, w, h, roof) => {
      rr(tx, base - h, w, h, 10); ctx.fillStyle = "#ffd3ea"; ctx.fill(); outline(4);
      ctx.beginPath(); ctx.moveTo(tx - 10, base - h + 4); ctx.lineTo(tx + w / 2, base - h - roof); ctx.lineTo(tx + w + 10, base - h + 4); ctx.closePath();
      ctx.fillStyle = P.lilac; ctx.fill(); outline(4);
      // banderita
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx + w / 2, base - h - roof); ctx.lineTo(tx + w / 2, base - h - roof - 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + w / 2, base - h - roof - 26); ctx.lineTo(tx + w / 2 + 22, base - h - roof - 20 + Math.sin(frame * 0.1) * 3); ctx.lineTo(tx + w / 2, base - h - roof - 14); ctx.closePath();
      ctx.fillStyle = P.hot; ctx.fill(); outline(3);
      // ventana corazón
      heartPath(tx + w / 2, base - h * 0.6, 10); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    };
    tower(x + 20, 70, 220, 80);
    tower(x + 250, 70, 220, 80);
    tower(x + 110, 110, 280, 110);
    rr(x + 60, base - 160, 220, 160, 14); ctx.fillStyle = "#ffe4f2"; ctx.fill(); outline(4);
    // puerta
    ctx.beginPath(); ctx.moveTo(x + 135, base); ctx.lineTo(x + 135, base - 60); ctx.arc(x + 170, base - 60, 35, Math.PI, TAU); ctx.lineTo(x + 205, base); ctx.closePath();
    ctx.fillStyle = P.lilac2; ctx.fill(); outline(4);
    circle(x + 192, base - 40, 4); ctx.fillStyle = P.yellow; ctx.fill();
  }

  /* ---------- Lila ---------- */
  function drawLila(L, sx, sy, sc = 1) {
    const t = L.walk;
    const moving = Math.abs(L.vx) > 0.3;
    const air = !L.onGround && state === "play";
    const squash = L.squash > 0 ? Math.sin((L.squash / 8) * Math.PI) * 0.08 : 0;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(L.face * sc * (1 + squash), sc * (1 - squash));
    ctx.lineJoin = "round"; ctx.lineCap = "round";

    const leg = (lx, phase, far) => {
      let swing = moving ? Math.sin(t * 2 + phase) * 7 : 0;
      let lift = moving ? Math.max(0, Math.cos(t * 2 + phase)) * 5 : 0;
      if (air) { swing = phase ? -6 : 6; lift = 6; }
      rr(lx - 7 + swing, -24 - lift, 14, 24, 7);
      ctx.fillStyle = far ? "#f1e8ff" : P.white; ctx.fill(); outline(3.5);
      rr(lx - 8 + swing, -8 - lift, 16, 9, 4);
      ctx.fillStyle = P.lilac2; ctx.fill(); outline(3.5);
    };

    // cola
    const wag = Math.sin(frame * 0.12) * 4;
    [[-46, -42, 12, P.lilac], [-56, -32 + wag, 11, P.pink], [-60, -18 + wag, 10, P.lilac2], [-54, -8 + wag, 8, P.pink]].forEach(([x, y, r, c]) => {
      circle(x, y, r); ctx.fillStyle = c; ctx.fill(); outline(3);
    });

    leg(-22, Math.PI, true); leg(18, 0, true);
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, -40, 40, 25, 0, 0, TAU);
    ctx.fillStyle = P.white; ctx.fill(); outline(4);
    // manchita de corazón
    heartPath(-12, -42, 7); ctx.fillStyle = P.pink; ctx.fill();
    leg(-12, 0, false); leg(28, Math.PI, false);

    // cuello y cabeza
    ctx.beginPath();
    ctx.moveTo(14, -50); ctx.quadraticCurveTo(22, -70, 28, -78); ctx.lineTo(44, -66); ctx.quadraticCurveTo(38, -52, 34, -44); ctx.closePath();
    ctx.fillStyle = P.white; ctx.fill();
    circle(34, -80, 26); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.beginPath(); ctx.ellipse(54, -70, 17, 14, 0.2, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    circle(34, -80, 24.5); ctx.fillStyle = P.white; ctx.fill(); // tapa la línea entre cabeza y hocico
    ctx.beginPath(); ctx.moveTo(14, -50); ctx.quadraticCurveTo(22, -70, 26, -76); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    // nariz y sonrisa
    circle(62, -72, 2.5); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(55, -66, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    // oreja
    ctx.beginPath(); ctx.moveTo(20, -98); ctx.lineTo(16, -118); ctx.lineTo(32, -104); ctx.closePath();
    ctx.fillStyle = P.white; ctx.fill(); outline(3.5);
    ctx.beginPath(); ctx.moveTo(21, -102); ctx.lineTo(19, -112); ctx.lineTo(27, -105); ctx.closePath(); ctx.fillStyle = P.pink; ctx.fill();
    // cuerno
    ctx.save(); ctx.translate(40, -102); ctx.rotate(0.35);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -34); ctx.lineTo(8, 0); ctx.closePath();
    ctx.fillStyle = P.gold; ctx.fill(); outline(3.5);
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 2.5;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 1.8, -i * 8); ctx.lineTo(8 - i * 1.8, -i * 8 - 4); ctx.stroke(); }
    ctx.restore();
    // crin
    const bounce = moving ? Math.sin(t * 2) * 2 : Math.sin(frame * 0.05) * 1.5;
    [[12, -100, 12, P.lilac], [4, -86, 12, P.pink], [2, -70, 11, P.lilac2], [6, -56, 10, P.lilac], [24, -108, 9, P.pink]].forEach(([x, y, r, c], i) => {
      circle(x, y + (i % 2 ? bounce : -bounce), r); ctx.fillStyle = c; ctx.fill(); outline(3);
    });
    // ojo grande kawaii
    if (L.blink < 8) {
      ctx.beginPath(); ctx.arc(42, -80, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(42, -82, 7.5, 10, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      circle(44.5, -86, 3.2); ctx.fillStyle = P.white; ctx.fill();
      circle(40, -78, 1.6); ctx.fill();
      // pestañas
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(46, -90); ctx.lineTo(51, -95); ctx.moveTo(43, -92); ctx.lineTo(45, -98); ctx.stroke();
    }
    // mejilla
    ctx.beginPath(); ctx.ellipse(48, -66, 7, 4.5, 0, 0, TAU); ctx.fillStyle = "rgba(255,140,198,0.65)"; ctx.fill();
    ctx.restore();
  }

  /* ---------- Partículas, HUD y pantallas ---------- */
  function drawParticles() {
    for (const p of particles) {
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      const x = p.x - cam;
      if (p.kind === "dot") { circle(x, p.y, p.r * (0.5 + a * 0.5)); ctx.fillStyle = p.col; ctx.fill(); }
      else if (p.kind === "heart") { heartPath(x, p.y, p.r * 0.7); ctx.fillStyle = p.col; ctx.fill(); }
      else { starPath(x, p.y, p.r, p.rot); ctx.fillStyle = p.col; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    for (const c of confetti) {
      ctx.save(); ctx.translate(c.x - cam, c.y); ctx.rotate(c.rot);
      if (c.heart) { heartPath(0, 0, 9); } else { rr(-6, -4, 12, 8, 3); }
      ctx.fillStyle = c.col; ctx.fill();
      ctx.restore();
    }
  }
  function label(text, x, y, size, fill = P.white, stroke = INK, align = "center") {
    ctx.font = `700 ${size}px "Fredoka", "Comic Sans MS", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = stroke; ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }
  function drawHud() {
    const y = 46 - offY;
    rr(20, y - 30, 200, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
    starPath(56, y, 20); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
    label(`${stars}/${totalStars}`, 140, y + 2, 30, P.white);
    if (hearts) {
      rr(234, y - 30, 120, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
      heartPath(268, y + 2, 16); ctx.fillStyle = P.hot; ctx.fill(); outline(3);
      label(String(hearts), 316, y + 2, 30);
    }
  }
  function drawTitle() {
    const cx = viewW / 2;
    const top = Math.max(-offY + 30, 40);
    label("Lila", cx, top + 70, 110, P.lilac, INK);
    label("la unicornia", cx, top + 160, 54, P.pink, INK);
    const fake = { vx: 3, face: 1, onGround: true, squash: 0, walk: frame * 0.08, blink: frame % 200 };
    drawLila(fake, cx - 10, top + 395 + Math.sin(frame * 0.08) * 10, 1.45);
    // botón de jugar
    const by = top + 490, pulse = 1 + Math.sin(frame * 0.1) * 0.05;
    ctx.save(); ctx.translate(cx, by); ctx.scale(pulse, pulse);
    rr(-110, -42, 220, 84, 42); ctx.fillStyle = P.hot; ctx.fill(); outline(5);
    ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(26, 0); ctx.lineTo(-18, 24); ctx.closePath(); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.restore();
    if (portrait) label("gira el móvil ↻", cx, by + 90, 30, P.white);
  }
  function drawReplay(cx, by) {
    const pulse = 1 + Math.sin(frame * 0.1) * 0.06;
    ctx.save(); ctx.translate(cx, by); ctx.scale(pulse, pulse);
    circle(0, 0, 48); ctx.fillStyle = P.lilac; ctx.fill(); outline(5);
    // flecha circular de "otra vez"
    ctx.beginPath(); ctx.arc(0, 0, 22, 0.3, TAU - 0.6); ctx.lineWidth = 9; ctx.strokeStyle = P.white; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, -28); ctx.lineTo(30, -14); ctx.lineTo(10, -8); ctx.closePath(); ctx.fillStyle = P.white; ctx.fill();
    ctx.restore();
  }
  function drawRescueCloud() {
    if (rescue <= 0) return;
    puff(lila.x - cam - 30, lila.y + lila.h - 10, 130, 1);
    face(lila.x - cam + 35, lila.y + lila.h + 2, 16);
  }
  // encoge un panel de ancho w centrado en (cx, cy) si la pantalla es más estrecha (móvil en vertical)
  function fitWidth(cx, cy, w) {
    const k = Math.min(1, (viewW - 24) / w);
    ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
  }
  function banner(title, sub, t) {
    if (t > 170) return;
    const a = Math.min(1, t / 15, (170 - t) / 20);
    ctx.globalAlpha = a;
    const cx = viewW / 2, y = Math.max(-offY + 40, 40) + 70;
    ctx.save(); fitWidth(cx, y, 680);
    rr(cx - 330, y - 60, 660, sub ? 140 : 100, 40); ctx.fillStyle = "rgba(255,255,255,0.93)"; ctx.fill(); outline(5);
    label(title, cx, y - 12, 48, P.pink2);
    if (sub) label(sub, cx, y + 46, 30, P.lilac);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------- Lila conejita ---------- */
  // De frente, para el laberinto y la merienda. (sx, sy) = pies.
  function drawBunny(B, sx, sy, sc = 1) {
    const hop = B.hop || 0;
    const look = B.look || 0;
    // sombrita
    ctx.globalAlpha = 0.18; ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(sx, sy, 24 * sc * (1 - hop / 60), 7 * sc, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(sx, sy - hop * sc); ctx.scale(sc, sc);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const lk = look * 4;
    // orejas largas que se mueven
    const wig = Math.sin(frame * 0.1 + (B.ph || 0)) * 0.07 + (hop > 2 ? 0.12 : 0);
    const ear = (x, rot) => {
      ctx.save(); ctx.translate(x + lk * 0.5, -66); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, -18, 9, 23, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(3.5);
      ctx.beginPath(); ctx.ellipse(0, -16, 4.5, 15, 0, 0, TAU); ctx.fillStyle = P.pink; ctx.fill();
      ctx.restore();
    };
    ear(-11, -0.22 - wig); ear(11, 0.22 + wig);
    // cuerpo, patitas y colita
    ctx.beginPath(); ctx.ellipse(0, -20, 22, 20, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.beginPath(); ctx.ellipse(0, -16, 12, 11, 0, 0, TAU); ctx.fillStyle = "#fff0f8"; ctx.fill();
    const step = B.moving ? Math.sin(frame * 0.4) * 3 : 0;
    ctx.beginPath(); ctx.ellipse(-11, -3 - step, 9, 5.5, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    ctx.beginPath(); ctx.ellipse(11, -3 + step, 9, 5.5, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    const arm = B.cheer ? -14 : 0;
    circle(-19, -26 + arm, 6); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    circle(19, -26 + arm, 6); ctx.fill(); outline(3);
    // cabeza
    circle(lk * 0.3, -50, 24); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    // ojos grandes
    const ex = lk;
    if (B.blink < 8) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex - 9, -52, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + 9, -52, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    } else {
      for (const d of [-9, 9]) {
        ctx.beginPath(); ctx.ellipse(ex + d, -52, 5.5, 7, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
        circle(ex + d + 1.8, -55, 2.2); ctx.fillStyle = P.white; ctx.fill();
        circle(ex + d - 1.5, -49.5, 1.1); ctx.fill();
      }
    }
    // naricita y boca "w"
    ctx.beginPath(); ctx.moveTo(ex - 3, -45); ctx.lineTo(ex + 3, -45); ctx.lineTo(ex, -42); ctx.closePath(); ctx.fillStyle = P.pink2; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ex - 2.5, -41, 2.5, 0, Math.PI); ctx.arc(ex + 2.5, -41, 2.5, 0, Math.PI); ctx.stroke();
    // mejillas
    ctx.fillStyle = "rgba(255,140,198,0.6)";
    ctx.beginPath(); ctx.ellipse(ex - 16, -44, 5, 3.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex + 16, -44, 5, 3.2, 0, 0, TAU); ctx.fill();
    // lazo lila con estrellita: lo que queda de la unicornia
    ctx.save(); ctx.translate(-15 + lk * 0.4, -70);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-13, -8); ctx.lineTo(-13, 8); ctx.closePath(); ctx.fillStyle = P.lilac2; ctx.fill(); outline(2.5);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(13, -8); ctx.lineTo(13, 8); ctx.closePath(); ctx.fill(); outline(2.5);
    starPath(0, 0, 6); ctx.fillStyle = P.gold; ctx.fill(); outline(2);
    ctx.restore();
    // cestita para la merienda
    if (B.basket) {
      rr(-30, -34, 60, 26, 10); ctx.fillStyle = "#f6cf94"; ctx.fill(); outline(3.5);
      ctx.strokeStyle = "#d9a35f"; ctx.lineWidth = 2.5;
      for (let i = -18; i <= 18; i += 12) { ctx.beginPath(); ctx.moveTo(i, -31); ctx.lineTo(i, -11); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-27, -22); ctx.lineTo(27, -22); ctx.stroke();
      heartPath(0, -22, 5); ctx.fillStyle = P.hot; ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- Pantalla 2: el laberinto de las zanahorias ---------- */
  // # seto · S salida · C zanahoria · G puerta corazón (se abre con todas las zanahorias) · E globo
  const MAZE = [
    "###############",
    "#S..#.....#...#",
    "#.#.#.###.#.#C#",
    "#.#...#C..#.#.#",
    "#.#####.###.#.#",
    "#C....#.....#.#",
    "####.##.#####.#",
    "#....#..#C....#",
    "#.####.##.#####",
    "#C.....#...G.E#",
    "###############",
  ];
  const MOY = (VH - MAZE.length * T) / 2;
  const MAZE_W = MAZE[0].length * T;
  let mz = null, bunny = null;
  const butterflies = Array.from({ length: 4 }, (_, i) => ({ ph: i * 1.7, sp: 0.6 + i * 0.15, col: [P.pink2, P.lilac2, P.yellow, P.blue][i] }));

  function startMaze() {
    setStage("maze"); playSong("maze");
    particles = []; confetti = [];
    mz = { cells: MAZE.map((r) => r.split("")), carrots: [], gate: null, exit: null, open: 0, opening: false, leaving: 0, total: 0 };
    let sx = 1, sy = 1;
    mz.cells.forEach((row, r) => row.forEach((ch, c) => {
      if (ch === "S") { sx = c; sy = r; }
      if (ch === "C") mz.carrots.push({ c, r, taken: false, ph: Math.random() * TAU });
      if (ch === "G") mz.gate = { c, r };
      if (ch === "E") mz.exit = { c, r };
    }));
    mz.total = mz.carrots.length;
    bunny = { x: sx * T + 12, y: MOY + sy * T + 12, w: 36, h: 36, look: 0, hop: 0, hopT: 0, moving: false, blink: 100 };
    mazeCam(true);
  }
  function solid(c, r) {
    const ch = mz.cells[r] && mz.cells[r][c];
    if (ch === undefined || ch === "#") return true;
    return ch === "G" && mz.open < 1;
  }
  function blockedAt(x, y, w, h) {
    const c0 = Math.floor(x / T), c1 = Math.floor((x + w - 0.01) / T);
    const r0 = Math.floor((y - MOY) / T), r1 = Math.floor((y + h - 0.01 - MOY) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solid(c, r)) return true;
    return false;
  }
  function mazeCam(snap) {
    // en horizontal con botones táctiles, la cruceta ocupa la izquierda: el laberinto se aparta
    const left = isTouch && !portrait ? (250 * Math.min(devicePixelRatio || 1, 2)) / scale : 0;
    const avail = viewW - left;
    let target;
    if (MAZE_W <= avail) target = -(left + (avail - MAZE_W) / 2);
    else target = Math.max(-left, Math.min(bunny.x + bunny.w / 2 - left - avail / 2, MAZE_W - viewW));
    cam = snap ? target : cam + (target - cam) * 0.12;
  }
  function updateMaze() {
    const B = bunny;
    if (--B.blink < 0) B.blink = 160 + Math.random() * 120;
    if (mz.leaving) { updateLeaving(); return; }
    const sp = 3.6;
    const dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const dy = dx ? 0 : (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    B.moving = !!(dx || dy);
    if (dx) {
      B.look = dx;
      if (!blockedAt(B.x + dx * sp, B.y, B.w, B.h)) B.x += dx * sp;
      else assist("y", Math.floor((B.x + (dx > 0 ? B.w + sp : -sp)) / T));
    }
    if (dy) {
      B.look = 0;
      if (!blockedAt(B.x, B.y + dy * sp, B.w, B.h)) B.y += dy * sp;
      else assist("x", Math.floor((B.y + (dy > 0 ? B.h + sp : -sp) - MOY) / T));
    }
    // saltitos al andar
    if (B.moving) {
      B.hopT += 0.22;
      const prev = B.hop;
      B.hop = Math.abs(Math.sin(B.hopT)) * 9;
      if (prev > 1 && B.hop <= 1 && frame % 2 === 0) sfx.hop();
    } else { B.hop *= 0.7; B.hopT = 0; }

    // zanahorias
    const bx = B.x + B.w / 2, by = B.y + B.h / 2;
    for (const k of mz.carrots) {
      if (k.taken) continue;
      if (Math.abs(k.c * T + T / 2 - bx) < 38 && Math.abs(MOY + k.r * T + T / 2 - by) < 38) {
        k.taken = true; carrots++; sfx.carrot();
        for (let i = 0; i < 10; i++) sparkle(k.c * T + T / 2, MOY + k.r * T + T / 2, i % 2 ? "#ffa94d" : P.mint2);
        if (mz.carrots.every((q) => q.taken)) { mz.opening = true; mz.openT = 0; sfx.gate(); }
      }
    }
    if (mz.opening && mz.open < 1) {
      mz.open = Math.min(1, mz.open + 0.025);
      if (frame % 3 === 0) sparkle(mz.gate.c * T + T / 2, MOY + mz.gate.r * T + T / 2, P.pink2, true);
    }
    // el globo
    const e = mz.exit;
    if (Math.abs(e.c * T + T / 2 - bx) < 30 && Math.abs(MOY + e.r * T + T / 2 - by) < 30) {
      mz.leaving = 1; sfx.balloon();
    }
    mazeCam(false);
  }
  function assist(axis, ahead) {
    // si choca por poco con una esquina, la recoloca suavemente en el pasillo
    const B = bunny;
    if (axis === "y") {
      const r = Math.round((B.y - MOY + B.h / 2 - T / 2) / T);
      if (solid(ahead, r)) return;
      const ty = MOY + r * T + (T - B.h) / 2;
      B.y += Math.max(-3, Math.min(3, ty - B.y));
    } else {
      const c = Math.round((B.x + B.w / 2 - T / 2) / T);
      if (solid(c, ahead)) return;
      const tx = c * T + (T - B.w) / 2;
      B.x += Math.max(-3, Math.min(3, tx - B.x));
    }
  }
  function updateLeaving() {
    const B = bunny, e = mz.exit;
    mz.leaving++;
    B.moving = false; B.look = 0; B.hop = 0; B.cheer = true;
    B.x += (e.c * T + 12 - B.x) * 0.15;
    const lift = Math.max(0, mz.leaving - 30);
    B.y = MOY + e.r * T + 12 - lift * lift * 0.03;
    if (mz.leaving === 120) fadeTo(startSky);
    mazeCam(false);
  }

  function drawMaze() {
    // fondo de prado
    const g = ctx.createLinearGradient(0, -offY, 0, VH);
    g.addColorStop(0, "#d8f5e4"); g.addColorStop(1, "#fff1f7");
    ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, viewH);
    for (let i = 0; i < 26; i++) {
      const x = ((i * 233 + frame * 0.1) % (viewW + 100)) - 50, y = -offY + ((i * 151) % (viewH + 40));
      flower(x, y, i % 3);
    }
    const ox = -cam;
    const rows = mz.cells.length, cols = mz.cells[0].length;
    // suelo a cuadritos
    rr(ox - 6, MOY - 6, cols * T + 12, rows * T + 12, 26); ctx.fillStyle = "#fffaf0"; ctx.fill(); outline(5);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (mz.cells[r][c] === "#") continue;
      ctx.fillStyle = (r + c) % 2 ? "#eafbe9" : "#f6fff2";
      ctx.fillRect(ox + c * T, MOY + r * T, T, T);
    }
    // setos: primero el contorno de todos, luego el relleno, para que se unan
    const hedge = (pad, col) => {
      ctx.fillStyle = col;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (mz.cells[r][c] !== "#") continue;
        rr(ox + c * T - pad + 2, MOY + r * T - pad + 2, T + pad * 2 - 4, T + pad * 2 - 4, 16); ctx.fill();
      }
    };
    hedge(3, INK); hedge(0, P.mint2);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (mz.cells[r][c] !== "#") continue;
      const x = ox + c * T, y = MOY + r * T;
      if (x < -T || x > viewW + T) continue;
      ctx.fillStyle = "#97e6c2"; circle(x + 20, y + 20, 10); ctx.fill();
      if ((r * 7 + c * 3) % 4 === 0) { ctx.fillStyle = [P.pink, P.white, P.yellow][(r + c) % 3]; circle(x + 38, y + 36, 5); ctx.fill(); circle(x + 38, y + 36, 2); ctx.fillStyle = P.hot; ctx.fill(); }
    }
    // zanahorias
    for (const k of mz.carrots) {
      if (k.taken) continue;
      drawCarrot(ox + k.c * T + T / 2, MOY + k.r * T + T / 2 + Math.sin(frame * 0.07 + k.ph) * 4, 1, Math.sin(frame * 0.05 + k.ph) * 0.2);
    }
    // puerta corazón
    const gx = ox + mz.gate.c * T, gy = MOY + mz.gate.r * T;
    if (mz.open < 1) {
      ctx.globalAlpha = 1 - mz.open;
      const sh = 1 - mz.open * 0.6;
      rr(gx + 6, gy + 4 + (1 - sh) * 30, T - 12, (T - 8) * sh, 10); ctx.fillStyle = P.pink; ctx.fill(); outline(4);
      ctx.strokeStyle = P.pink2; ctx.lineWidth = 3;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx + 6 + i * 12, gy + 8); ctx.lineTo(gx + 6 + i * 12, gy + T - 8); ctx.stroke(); }
      heartPath(gx + T / 2, gy + T / 2, 13); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
      ctx.globalAlpha = 1;
    }
    // globo de salida
    const e = mz.exit;
    const lift = mz.leaving ? Math.max(0, mz.leaving - 30) ** 2 * 0.03 : 0;
    drawBalloon(ox + e.c * T + T / 2, MOY + e.r * T + T - 6 - lift + Math.sin(frame * 0.05) * 3, 0.8);
    // conejita (dentro de la cesta si se va)
    const B = bunny;
    if (mz.leaving) {
      drawBunny(B, B.x - cam + B.w / 2, B.y + B.h - 4, 0.6);
      drawBasketFront(ox + e.c * T + T / 2, MOY + e.r * T + T - 6 - lift + Math.sin(frame * 0.05) * 3, 0.8);
    } else {
      drawBunny(B, B.x - cam + B.w / 2, B.y + B.h, 0.75);
    }
    // mariposas
    for (const b of butterflies) {
      const t = frame * 0.01 * b.sp + b.ph;
      const x = viewW / 2 + Math.sin(t * 1.3) * viewW * 0.42, y = VH / 2 + Math.sin(t * 2.1) * 260;
      const fl = Math.abs(Math.sin(frame * 0.3 + b.ph)) * 0.8 + 0.2;
      ctx.fillStyle = b.col;
      ctx.beginPath(); ctx.ellipse(x - 7 * fl, y, 8 * fl, 10, -0.4, 0, TAU); ctx.fill(); outline(2.5);
      ctx.beginPath(); ctx.ellipse(x + 7 * fl, y, 8 * fl, 10, 0.4, 0, TAU); ctx.fill(); outline(2.5);
      rr(x - 2, y - 8, 4, 16, 2); ctx.fillStyle = INK; ctx.fill();
    }
  }
  function drawCarrot(x, y, s, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = P.mint2;
    for (const a of [-0.5, 0, 0.5]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -22, 5, 11, 0, 0, TAU); ctx.fill(); outline(2.5); ctx.restore(); }
    ctx.beginPath(); ctx.moveTo(-14, -12); ctx.quadraticCurveTo(0, -18, 14, -12); ctx.quadraticCurveTo(6, 10, 0, 22); ctx.quadraticCurveTo(-6, 10, -14, -12); ctx.closePath();
    ctx.fillStyle = "#ffa94d"; ctx.fill(); outline(3);
    ctx.strokeStyle = "#e8812a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-3, 4); ctx.moveTo(4, 10); ctx.lineTo(8, 10); ctx.stroke();
    face(0, -5, 10);
    ctx.restore();
  }
  function drawBalloon(x, y, s) {
    // y = fondo de la cesta
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-18, -26); ctx.lineTo(-30, -78); ctx.moveTo(18, -26); ctx.lineTo(30, -78); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -120, 52, 0, TAU); ctx.fillStyle = P.pink; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = P.lilac;
    for (let i = -2; i <= 2; i += 2) { ctx.beginPath(); ctx.ellipse(i * 16, -120, 10, 54, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    circle(0, -120, 52); outline(4);
    face(0, -112, 26);
    rr(-24, -28, 48, 28, 8); ctx.fillStyle = "#f6cf94"; ctx.fill(); outline(3.5);
    ctx.restore();
  }
  function drawBasketFront(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    rr(-24, -28, 48, 28, 8); ctx.fillStyle = "#f6cf94"; ctx.fill(); outline(3.5);
    ctx.strokeStyle = "#d9a35f"; ctx.lineWidth = 2.5;
    for (let i = -12; i <= 12; i += 12) { ctx.beginPath(); ctx.moveTo(i, -24); ctx.lineTo(i, -4); ctx.stroke(); }
    ctx.restore();
  }
  function drawMazeHud() {
    const y = 46 - offY;
    rr(20, y - 30, 200, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
    drawCarrot(56, y + 2, 0.8, 0.3);
    label(`${carrots}/${mz.total}`, 140, y + 2, 30, "#ffa94d");
  }

  /* ---------- Pantalla 3: la merienda en las nubes ---------- */
  const FLOOR = 600;
  let sk = null;
  const SWEETS = ["cupcake", "strawberry", "star", "candy", "cupcake", "strawberry"];
  function startSky() {
    setStage("sky"); playSong("sky");
    particles = []; confetti = [];
    cam = 0;
    sk = { things: [], spawn: 40, goal: 12, done: 0, friends: [] };
    bunny = { x: viewW / 2, y: FLOOR, vx: 0, vy: 0, look: 0, hop: 0, moving: false, blink: 100, basket: true };
  }
  function updateSkyStage() {
    const B = bunny;
    if (--B.blink < 0) B.blink = 160 + Math.random() * 120;
    if (state === "end") {
      B.basket = false; B.cheer = true; B.moving = false;
      B.hop = Math.abs(Math.sin(stateT * 0.12)) * 26; B.look = Math.floor(stateT / 50) % 2 ? -1 : 1;
      B.x += (Math.max(60, viewW / 2 - 170) - B.x) * 0.05;
      if (confetti.length < 160 && frame % 2 === 0) confetti.push(newConfetti(false));
      return;
    }
    // izquierda / derecha, y un saltito con el corazón
    const maxV = 6.5;
    if (keys.left && !keys.right) { B.vx = Math.max(B.vx - 0.8, -maxV); B.look = -1; }
    else if (keys.right && !keys.left) { B.vx = Math.min(B.vx + 0.8, maxV); B.look = 1; }
    else { B.vx *= 0.8; if (Math.abs(B.vx) < 0.2) { B.vx = 0; B.look = 0; } }
    B.x = Math.max(50, Math.min(viewW - 50, B.x + B.vx));
    B.moving = Math.abs(B.vx) > 0.5;
    if (jumpBuffer > 0) jumpBuffer--;
    if (jumpBuffer > 0 && B.hop === 0) { B.vy = 11; jumpBuffer = 0; sfx.jump(); }
    if (B.vy || B.hop > 0) { B.hop += B.vy; B.vy -= 0.8; if (B.hop <= 0) { B.hop = 0; B.vy = 0; } }
    else if (B.moving) B.hop = 0;

    // caen dulces (despacito)
    if (sk.done < sk.goal && --sk.spawn <= 0) {
      sk.spawn = Math.max(38, 70 - sk.done * 3);
      // a veces cae cerca de Lila, para que sea fácil
      const near = Math.random() < 0.4;
      const x = near ? B.x + (Math.random() - 0.5) * 300 : 80 + Math.random() * (viewW - 160);
      sk.things.push({ kind: SWEETS[(Math.random() * SWEETS.length) | 0], x: Math.max(70, Math.min(viewW - 70, x)), y: -offY - 40, vy: 1.6 + Math.random() * 0.8, ph: Math.random() * TAU });
    }
    const catchY = FLOOR - B.hop * 1.2 - 30;
    for (const it of sk.things) {
      it.y += it.vy; it.x += Math.sin(frame * 0.03 + it.ph) * 0.4;
      if (!it.gone && Math.abs(it.x - B.x) < 50 && Math.abs(it.y - catchY) < 34) {
        it.gone = true; sk.done++; sweets++; sfx.yum();
        for (let i = 0; i < 10; i++) sparkle(it.x, it.y, [P.pink2, P.yellow, P.lilac2][i % 3], i % 2 === 0);
        if (sk.done >= sk.goal) {
          sfx.win();
          for (let i = 0; i < 140; i++) confetti.push(newConfetti(true));
          sk.finishT = 0;
        }
      } else if (!it.gone && it.y > FLOOR + 10) {
        it.gone = true; sfx.plop();
        for (let i = 0; i < 6; i++) sparkle(it.x, FLOOR, P.white);
      }
    }
    sk.things = sk.things.filter((it) => !it.gone);
    if (sk.finishT !== undefined && ++sk.finishT === 90) fadeTo(() => { setStage("end"); playSong("party"); sk.things = []; for (let i = 0; i < 120; i++) confetti.push(newConfetti(true)); });
  }

  function drawSweet(kind, x, y, s = 1, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    if (kind === "cupcake") {
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(13, 22); ctx.lineTo(-13, 22); ctx.closePath();
      ctx.fillStyle = P.lilac; ctx.fill(); outline(3);
      ctx.strokeStyle = P.lilac2; ctx.lineWidth = 2.5;
      for (let i = -8; i <= 8; i += 8) { ctx.beginPath(); ctx.moveTo(i, 3); ctx.lineTo(i * 0.8, 19); ctx.stroke(); }
      ctx.fillStyle = P.pink;
      ctx.beginPath(); ctx.arc(-10, -2, 10, 0, TAU); ctx.arc(10, -2, 10, 0, TAU); ctx.arc(0, -12, 12, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(-10, -2, 10, Math.PI * 0.5, Math.PI * 1.4); ctx.arc(0, -12, 12, Math.PI * 1.1, Math.PI * 1.9); ctx.arc(10, -2, 10, Math.PI * 1.6, Math.PI * 0.5); outline(3);
      circle(0, -26, 6); ctx.fillStyle = "#ff4d6d"; ctx.fill(); outline(2.5);
      face(0, 10, 9);
    } else if (kind === "strawberry") {
      ctx.beginPath(); ctx.moveTo(0, 22); ctx.bezierCurveTo(-26, 4, -20, -16, 0, -14); ctx.bezierCurveTo(20, -16, 26, 4, 0, 22); ctx.closePath();
      ctx.fillStyle = "#ff6f91"; ctx.fill(); outline(3);
      ctx.fillStyle = "#fff6a8";
      for (const [a, b] of [[-9, -2], [9, -2], [-4, 9], [5, 10], [0, -6]]) { ctx.beginPath(); ctx.ellipse(a, b, 1.6, 2.4, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = P.mint2;
      ctx.beginPath(); ctx.moveTo(-12, -15); ctx.lineTo(0, -10); ctx.lineTo(12, -15); ctx.lineTo(5, -19); ctx.lineTo(0, -24); ctx.lineTo(-5, -19); ctx.closePath(); ctx.fill(); outline(2.5);
      face(0, 2, 9);
    } else if (kind === "star") {
      starPath(0, 0, 22); ctx.fillStyle = P.yellow; ctx.fill(); outline(3.5);
      face(0, 2, 13);
    } else {
      // caramelo
      ctx.fillStyle = P.mint;
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-28, -10); ctx.lineTo(-28, 10); ctx.closePath(); ctx.fill(); outline(3);
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(28, -10); ctx.lineTo(28, 10); ctx.closePath(); ctx.fill(); outline(3);
      circle(0, 0, 16); ctx.fillStyle = P.white; ctx.fill(); outline(3);
      ctx.strokeStyle = P.hot; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 1.4); ctx.stroke();
    }
    ctx.restore();
  }
  function drawSkyStage() {
    const g = ctx.createLinearGradient(0, -offY, 0, VH);
    g.addColorStop(0, "#ffd6ef"); g.addColorStop(0.6, "#ffe9f4"); g.addColorStop(1, "#fff4e0");
    ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, viewH);
    // estrellitas que titilan
    for (let i = 0; i < 30; i++) {
      const x = (i * 197) % viewW, y = -offY + ((i * 89) % Math.max(200, offY + 380));
      ctx.globalAlpha = 0.5 + Math.sin(frame * 0.05 + i) * 0.4;
      starPath(x, y, 6 + (i % 3) * 2); ctx.fillStyle = P.white; ctx.fill();
    }
    ctx.globalAlpha = 1;
    // arcoíris
    const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
    ctx.lineWidth = 16; ctx.globalAlpha = 0.5;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(viewW * 0.25, 640, 330 - i * 16, Math.PI, TAU); ctx.stroke(); });
    ctx.globalAlpha = 1;
    for (const c of bgClouds) {
      const x = ((c.x + frame * 0.25) % 3600 + 3600) % 3600 - 300;
      if (x > viewW + 200) continue;
      puff(x, c.y - 20, 110 * c.s, 0.9);
    }
    // globos que suben
    for (let i = 0; i < 5; i++) {
      const x = ((i * 311 + 120) % viewW), y = VH - ((frame * (0.4 + i * 0.07) + i * 260) % (VH + offY + 300));
      circle(x, y, 18); ctx.fillStyle = [P.pink, P.lilac, P.mint, P.yellow, P.blue][i]; ctx.fill(); outline(3);
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.quadraticCurveTo(x + 6, y + 40, x, y + 60); ctx.stroke();
    }
    // suelo de nube esponjosa
    ctx.fillStyle = P.white;
    ctx.beginPath();
    for (let x = -40; x < viewW + 80; x += 70) { ctx.moveTo(x + 50, FLOOR + 20); ctx.arc(x, FLOOR + 20 + Math.sin(x * 0.05) * 6, 50, 0, TAU); }
    ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillRect(-10, FLOOR + 10, viewW + 20, viewH);
    for (let x = 60; x < viewW; x += 260) face(x, FLOOR + 50, 20);

    if (state === "end") { ctx.save(); fitWidth(viewW / 2, FLOOR, 580); drawParty(); ctx.restore(); }
    // dulces cayendo
    for (const it of sk.things) drawSweet(it.kind, it.x, it.y, 1, Math.sin(frame * 0.05 + it.ph) * 0.3);
    drawBunny(bunny, bunny.x, FLOOR, 1.25);
  }
  function drawSkyHud() {
    const y = 46 - offY;
    const w = 90 + sk.goal * 26;
    rr(20, y - 30, w, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
    drawSweet("cupcake", 52, y + 4, 0.75);
    for (let i = 0; i < sk.goal; i++) {
      circle(96 + i * 26, y + 2, 9);
      ctx.fillStyle = i < sk.done ? P.hot : "#f3e6ff"; ctx.fill(); outline(2.5);
    }
  }
  function drawParty() {
    // tarta enorme con velitas, y amiguitos que han venido a la merienda
    const cx = viewW / 2 + 40, base = FLOOR + 6;
    rr(cx - 110, base - 70, 220, 70, 18); ctx.fillStyle = P.pink; ctx.fill(); outline(4);
    rr(cx - 80, base - 130, 160, 64, 16); ctx.fillStyle = P.cream; ctx.fill(); outline(4);
    rr(cx - 50, base - 180, 100, 54, 14); ctx.fillStyle = P.lilac; ctx.fill(); outline(4);
    ctx.fillStyle = P.white;
    for (let i = -100; i <= 90; i += 30) { circle(cx + i + 12, base - 68, 9); ctx.fill(); }
    for (const [x, c] of [[-28, P.blue], [0, P.mint], [28, P.yellow]]) {
      rr(cx + x - 5, base - 214, 10, 34, 4); ctx.fillStyle = c; ctx.fill(); outline(2.5);
      const fl = 1 + Math.sin(frame * 0.3 + x) * 0.15;
      ctx.beginPath(); ctx.ellipse(cx + x, base - 224, 6 * fl, 10 * fl, 0, 0, TAU); ctx.fillStyle = "#ffb347"; ctx.fill();
    }
    face(cx, base - 36, 22);
    // pollitos
    for (const [i, x] of [[0, cx + 150], [1, cx + 215]]) {
      const hop = Math.abs(Math.sin(stateT * 0.14 + i)) * 18;
      const y = base - 26 - hop;
      circle(x, y, 26); ctx.fillStyle = P.yellow; ctx.fill(); outline(4);
      ctx.beginPath(); ctx.moveTo(x - 6, y + 2); ctx.lineTo(x + 6, y + 2); ctx.lineTo(x, y + 10); ctx.closePath(); ctx.fillStyle = "#ffa94d"; ctx.fill();
      face(x, y - 6, 18);
      ctx.beginPath(); ctx.moveTo(x - 4, y - 26); ctx.quadraticCurveTo(x, y - 40, x + 6, y - 28); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  function drawEnd() {
    if (stateT < 30) return;
    const cx = viewW / 2, top = Math.max(-offY + 30, 30);
    ctx.save(); fitWidth(cx, top, 660);
    rr(cx - 320, top + 20, 640, 180, 40); ctx.fillStyle = "rgba(255,255,255,0.93)"; ctx.fill(); outline(5);
    label("¡Qué fiesta!", cx, top + 76, 66, P.hot);
    const y = top + 152;
    starPath(cx - 210, y, 20); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
    label(`${stars}`, cx - 180, y + 2, 36, P.yellow, INK, "left");
    heartPath(cx - 90, y, 16); ctx.fillStyle = P.hot; ctx.fill(); outline(3);
    label(`${hearts}`, cx - 64, y + 2, 36, P.pink, INK, "left");
    drawCarrot(cx + 30, y, 0.75, 0.3);
    label(`${carrots}`, cx + 54, y + 2, 36, "#ffa94d", INK, "left");
    drawSweet("cupcake", cx + 150, y + 2, 0.75);
    label(`${sweets}`, cx + 176, y + 2, 36, P.lilac, INK, "left");
    ctx.restore();
    if (stateT > 120) drawReplay(cx, top + 280);
  }

  function render() {
    ctx.setTransform(scale, 0, 0, scale, 0, offY * scale);
    if (state === "maze") {
      drawMaze();
      drawParticles();
      drawMazeHud();
      banner("El laberinto de las zanahorias", isTouch ? "¡recoge todas las zanahorias!" : "recoge las zanahorias con las flechas", stateT);
    } else if (state === "sky" || state === "end") {
      drawSkyStage();
      drawParticles();
      if (state === "sky") { drawSkyHud(); banner("La merienda en las nubes", "¡atrapa los dulces con la cestita!", stateT); }
      else drawEnd();
    } else {
      drawSky();
      drawCastle();
      drawClouds();
      drawGround();
      drawSprings();
      drawItems();
      if (state === "magic" && bunnyForm) {
        drawBunny({ blink: lila.blink, cheer: stateT > 160, hop: 0, look: 0 }, lila.x - cam + lila.w / 2, lila.y + lila.h + 1, 1);
        if (stateT > 150) {
          const y = Math.max(-offY + 40, 40) + 60;
          ctx.save(); fitWidth(viewW / 2, y, 640);
          label("¡Lila es una conejita!", viewW / 2, y, 56, P.pink2);
          ctx.restore();
        }
      } else if (state !== "title") {
        drawRescueCloud();
        drawLila(lila, lila.x - cam + lila.w / 2 - 6, lila.y + lila.h + 1, 1);
      }
      if (state === "magic" && stateT > 120 && stateT < 160) {
        // destello mágico
        const a = 1 - Math.abs(stateT - 140) / 20;
        ctx.globalAlpha = a;
        const g = ctx.createRadialGradient(lila.x - cam + 32, lila.y + 32, 10, lila.x - cam + 32, lila.y + 32, 260);
        g.addColorStop(0, "#ffffff"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, viewH);
        ctx.globalAlpha = 1;
      }
      drawParticles();
      if (state === "play") drawHud();
      if (state === "title") drawTitle();
    }
    if (fade) {
      ctx.globalAlpha = fade.t < 30 ? fade.t / 30 : 1 - (fade.t - 30) / 30;
      ctx.fillStyle = "#fff4fb"; ctx.fillRect(0, -offY, viewW, viewH);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- Bucle ---------- */
  document.body.dataset.stage = state;
  resize();
  buildLevel();
  cam = 0; particles = [];
  playSong("meadow");
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 100);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    musicTick();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
