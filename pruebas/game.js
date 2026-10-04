/* Lila la unicornia — una aventura tierna y muy fácil para peques, en tres pantallas.
   1) Plataformas con Lila la unicornia.  2) Laberinto con Lila convertida en conejito.
   3) Sorpresa bajo el mar con Lila convertida en ballenita.
   No se pierde nunca: no hay enemigos ni tiempo. Sin dependencias. */
(() => {
  "use strict";

  const VH = 720;          // alto del mundo en unidades
  const T = 60;            // casilla de la pantalla 1
  const TAU = Math.PI * 2;
  const STEP = 1000 / 60;
  const INK = "#5b4370";
  const P = {
    lilac: "#c9a7f5", lilac2: "#b48cf0", lilac3: "#f1e8ff", pink: "#ffb6d9", pink2: "#ff8cc6", hot: "#ff5fa8",
    mint: "#a8e6cf", mint2: "#7fd8b4", cream: "#fff3e3", yellow: "#ffd84d", gold: "#ffd86b",
    sky1: "#bfe3ff", sky2: "#ffe3f3", white: "#ffffff", peach: "#ffd6b8", blue: "#a9d8ff",
    orange: "#ffad5c", sea1: "#9fdcf5", sea2: "#6fb8e8", sea3: "#4f94d4", sand: "#ffe7b8",
  };

  /* ---------- Pantalla ---------- */
  const screen = document.getElementById("screen");
  const ctx = screen.getContext("2d");
  let W = 0, H = 0, dpr = 1, scale = 1, viewW = 0, viewH = 0, offY = 0, portrait = false;
  const isTouch = matchMedia("(hover: none) and (pointer: coarse)").matches;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = screen.width = Math.round(innerWidth * dpr);
    H = screen.height = Math.round(innerHeight * dpr);
    portrait = H > W;
    scale = Math.min(H / VH, W / (portrait ? 560 : 900));
    viewW = W / scale; viewH = H / scale;
    // en vertical sobra cielo arriba; con botones táctiles, el suelo queda por encima de ellos
    const reserve = isTouch && portrait ? (230 * dpr) / scale : 0;
    offY = viewH - VH - reserve;
  }
  addEventListener("resize", resize);
  resize();
  const setWorld = () => ctx.setTransform(scale, 0, 0, scale, 0, offY * scale);
  const setUI = () => ctx.setTransform(scale, 0, 0, scale, 0, 0);

  /* ---------- Entrada ---------- */
  const keys = { left: false, right: false, up: false, down: false, jump: false };
  let jumpBuffer = 0;
  const KEYMAP = {
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    Space: "jump", KeyZ: "jump",
  };
  function press(k) {
    if ((k === "jump" || k === "up") && !keys[k]) jumpBuffer = 8;
    keys[k] = true;
  }
  addEventListener("keydown", (e) => {
    const k = KEYMAP[e.code];
    if (k) { e.preventDefault(); press(k); }
    if (e.code === "Space" || e.code === "Enter") tapStart();
    unlockAudio();
  });
  addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });

  document.querySelectorAll(".touch button").forEach((b) => {
    const k = b.dataset.key;
    const on = (e) => { e.preventDefault(); press(k); b.classList.add("on"); unlockAudio(); tapStart(); };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
    b.addEventListener("pointerdown", on);
    b.addEventListener("pointerup", off);
    b.addEventListener("pointercancel", off);
    b.addEventListener("pointerleave", off);
  });
  screen.addEventListener("pointerdown", () => { unlockAudio(); tapStart(); });

  /* ---------- Sonido: efectos cuquis y musiquita ---------- */
  let ac = null, master = null, muted = false;
  const muteBtn = document.getElementById("mute");
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "🔇" : "🔊";
    unlockAudio();
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ac.currentTime, 0.05);
  });
  function unlockAudio() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
      } catch { return; }
    }
    if (ac.state === "suspended") ac.resume();
    startMusicLoop();
  }
  function tone(f0, f1, dur, vol = 0.08, delay = 0, type = "sine", at) {
    if (!ac) return;
    const t = at !== undefined ? at : ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  const sfx = {
    jump: () => { tone(500, 900, 0.14, 0.06); tone(1200, 1500, 0.08, 0.025, 0.05); },
    star: () => { tone(1318, 1318, 0.08, 0.05); tone(1760, 1760, 0.16, 0.045, 0.07); tone(2637, 2637, 0.1, 0.02, 0.12); },
    heart: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.14, 0.05, i * 0.07)),
    boing: () => { tone(200, 900, 0.32, 0.08, 0, "triangle"); tone(400, 1800, 0.2, 0.02, 0.03); },
    rescue: () => [880, 784, 988, 1175].forEach((f, i) => tone(f, f * 1.01, 0.16, 0.05, i * 0.1)),
    hop: () => tone(600, 820, 0.07, 0.035, 0, "sine"),
    munch: () => { tone(700, 500, 0.06, 0.06, 0, "square"); tone(800, 600, 0.06, 0.04, 0.09, "square"); tone(1046, 1568, 0.18, 0.04, 0.18); },
    bump: () => tone(300, 260, 0.08, 0.04, 0, "triangle"),
    door: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.2, 0.05, i * 0.09, "triangle")),
    bubble: () => { const f = 700 + Math.random() * 500; tone(f, f * 2.2, 0.09, 0.06); },
    jelly: () => { tone(330, 660, 0.12, 0.06, 0, "triangle"); tone(660, 330, 0.12, 0.05, 0.12, "triangle"); },
    swim: () => tone(380, 520, 0.1, 0.02),
    poof: () => { tone(1500, 300, 0.5, 0.05, 0, "sine"); [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, f, 0.18, 0.035, 0.35 + i * 0.08)); },
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.22, 0.06, i * 0.13, "triangle")),
  };

  // Secuenciador sencillo: cada canción tiene pistas de [nota MIDI, corcheas]; 0 es silencio.
  const SONGS = {
    plat: { tempo: 132, tracks: [
      { type: "triangle", vol: 0.035, notes: [[72,1],[76,1],[79,1],[76,1],[81,2],[79,2],[77,1],[81,1],[79,1],[77,1],[76,4],[74,1],[77,1],[81,1],[77,1],[79,2],[76,2],[74,1],[76,1],[74,1],[71,1],[72,4]] },
      { type: "sine", vol: 0.05, notes: [[48,2],[55,2],[55,2],[55,2],[53,2],[60,2],[48,2],[55,2],[50,2],[57,2],[55,2],[59,2],[55,2],[50,2],[48,4]] },
    ] },
    maze: { tempo: 116, tracks: [
      { type: "square", vol: 0.018, notes: [[79,1],[0,1],[76,1],[79,1],[81,2],[79,2],[76,1],[74,1],[72,1],[74,1],[76,4],[79,1],[0,1],[81,1],[84,1],[81,2],[79,2],[76,1],[79,1],[76,1],[74,1],[72,4]] },
      { type: "triangle", vol: 0.05, notes: [[48,2],[55,2],[48,2],[55,2],[45,2],[52,2],[45,2],[52,2],[41,2],[48,2],[41,2],[48,2],[43,2],[50,2],[43,2],[50,2]] },
    ] },
    sea: { tempo: 96, tracks: [
      { type: "sine", vol: 0.045, notes: [[76,2],[79,2],[83,4],[81,2],[79,2],[76,4],[74,2],[76,2],[79,4],[76,8]] },
      { type: "sine", vol: 0.022, notes: [[60,1],[64,1],[67,1],[72,1],[60,1],[64,1],[67,1],[72,1],[57,1],[60,1],[64,1],[69,1],[57,1],[60,1],[64,1],[69,1],[53,1],[57,1],[60,1],[65,1],[53,1],[57,1],[60,1],[65,1],[55,1],[59,1],[62,1],[67,1],[55,1],[59,1],[62,1],[67,1]] },
    ] },
    end: { tempo: 140, tracks: [
      { type: "triangle", vol: 0.04, notes: [[72,1],[76,1],[79,1],[84,3],[79,1],[84,1],[88,6],[0,2],[86,1],[84,1],[81,1],[84,3],[79,1],[76,1],[79,6],[0,2]] },
      { type: "sine", vol: 0.05, notes: [[48,4],[55,4],[53,4],[48,4],[50,4],[55,4],[48,4],[55,4]] },
    ] },
  };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let song = null, songName = "", songTimer = null;
  function playSong(name) {
    if (songName === name) return;
    songName = name;
    song = null;
    if (ac) startSong();
  }
  function startSong() {
    const s = SONGS[songName];
    if (!s) return;
    const t0 = ac.currentTime + 0.1;
    song = { s, eighth: 60 / s.tempo / 2, tracks: s.tracks.map((tr) => ({ tr, i: 0, t: t0 })) };
  }
  function startMusicLoop() {
    if (songTimer || !ac) return;
    songTimer = setInterval(() => {
      if (!ac || ac.state !== "running") return;
      if (!song) startSong();
      if (!song) return;
      const horizon = ac.currentTime + 0.2;
      for (const st of song.tracks) {
        while (st.t < horizon) {
          const [n, len] = st.tr.notes[st.i];
          const dur = len * song.eighth;
          if (n) tone(midi(n), midi(n), Math.max(0.12, dur * 0.9), st.tr.vol, 0, st.tr.type, st.t);
          st.t += dur;
          st.i = (st.i + 1) % st.tr.notes.length;
        }
      }
    }, 50);
  }

  /* ---------- Estado general ---------- */
  // title | plat | castle | morph | maze | sea | end
  let state = "title", stateT = 0, frame = 0;
  let particles = [], confetti = [];
  let stars = 0, hearts = 0, totalStars = 0, carrots = 0, bubbles = 0, shells = 0;
  let morph = null;

  function setState(s) { state = s; stateT = 0; }
  function newGame() {
    stars = hearts = carrots = bubbles = shells = 0;
    particles = []; confetti = [];
    startPlat();
  }
  function tapStart() {
    if (state === "title" || (state === "end" && stateT > 150)) newGame();
  }

  /* =====================================================================
     PANTALLA 1 — plataformas con Lila la unicornia
     ===================================================================== */
  const ground = [], clouds = [], springs = [];
  let items = [];
  const END = 156 * T;
  const CASTLE = 146 * T;
  let lila, cam = 0, rescue = 0;

  function buildPlat() {
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
    totalStars = items.filter((i) => i.kind === "star").length;
  }
  function startPlat() {
    buildPlat();
    lila = { x: 2 * T, y: 10 * T - 64, w: 64, h: 64, vx: 0, vy: 0, onGround: false, face: 1, walk: 0, coyote: 0, safeX: 2 * T, safeY: 10 * T - 64, squash: 0, blink: 120, scale: 1 };
    cam = 0; rescue = 0;
    setState("plat");
    playSong("plat");
  }

  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function updatePlat() {
    const L = lila;
    if (rescue > 0) {
      // una nubecita baja a Lila con calma
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
    if (!keys.jump && !keys.up && L.vy < -8) L.vy += 0.6;
    L.vy = Math.min(L.vy + 0.8, 15);

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
    if (L.onGround && !wasOnGround) L.squash = 8;
    if (L.squash > 0) L.squash--;

    for (const s of springs) {
      if (s.squash > 0) s.squash--;
      // salta al pisarla o al chocar con ella andando: más fácil para peques
      if (L.vy >= 0 && overlap(L, s) && (prevBottom <= s.y + 12 || L.onGround)) {
        L.y = s.y - L.h; L.vy = -25; L.onGround = false; L.coyote = 0;
        s.squash = 14; sfx.boing();
        for (let i = 0; i < 10; i++) sparkle(s.x + 24, s.y, P.pink2);
      }
    }

    const hb = { x: L.x - 8, y: L.y - 12, w: L.w + 16, h: L.h + 16 };
    for (const it of items) {
      if (it.taken) continue;
      if (Math.abs(it.x - (hb.x + hb.w / 2)) < hb.w / 2 + 18 && Math.abs(it.y - (hb.y + hb.h / 2)) < hb.h / 2 + 18) {
        it.taken = true;
        if (it.kind === "star") { stars++; sfx.star(); for (let i = 0; i < 8; i++) sparkle(it.x, it.y, P.yellow); }
        else { hearts++; sfx.heart(); for (let i = 0; i < 12; i++) sparkle(it.x, it.y, P.pink2, true); }
      }
    }

    if ((Math.abs(L.vx) > 3 || !L.onGround) && frame % 3 === 0) rainbowTrail(L.x + (L.face > 0 ? 6 : L.w - 6), L.y + 22 + (frame % 18), -L.face * 0.4);

    L.walk += Math.abs(L.vx) * 0.06;
    if (--L.blink < 0) L.blink = 160 + Math.random() * 120;

    if (L.y > VH + 120) { rescue = 70; L.vx = 0; L.vy = 0; L.y = -120 - offY; sfx.rescue(); }

    // al llegar al castillo, Lila entra por la puerta
    if (L.x > CASTLE - T && L.onGround) { setState("castle"); }
    followCam();
  }
  function updateCastle() {
    const L = lila;
    const door = CASTLE + 170 - L.w / 2;
    L.face = 1; L.vy = 0;
    if (L.x < door) { L.x = Math.min(door, L.x + 3); L.vx = 3; L.walk += 0.18; }
    else { L.vx = 0; L.scale = Math.max(0, L.scale - 0.03); if (frame % 4 === 0) sparkle(L.x + L.w / 2, L.y + 20, P.pink2, true); }
    if (L.scale <= 0) startMorph("bunny");
    followCam();
  }
  function followCam() {
    const target = lila.x + lila.w / 2 - viewW * 0.4;
    cam += (target - cam) * 0.12;
    cam = Math.max(0, Math.min(cam, END - viewW));
  }

  /* =====================================================================
     TRANSFORMACIÓN entre pantallas
     ===================================================================== */
  function startMorph(to) {
    morph = { to, from: to === "bunny" ? "unicorn" : "bunny" };
    setState("morph");
    sfx.poof();
    playSong("end");
    confetti = [];
  }
  function updateMorph() {
    if (stateT === 70) { sfx.poof(); for (let i = 0; i < 40; i++) particles.push(burstStar()); }
    if (stateT > 230) {
      if (morph.to === "bunny") startMaze(); else startSea();
    }
  }
  function burstStar() {
    const a = Math.random() * TAU, v = 3 + Math.random() * 7;
    const cols = [P.pink2, P.lilac2, P.yellow, P.mint2, P.blue, P.hot];
    return { ui: true, x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 60, max: 60, col: cols[(Math.random() * 6) | 0], r: 8 + Math.random() * 8, kind: Math.random() < 0.4 ? "heart" : "star", rot: Math.random() * TAU };
  }

  /* =====================================================================
     PANTALLA 2 — laberinto con Lila conejito
     ===================================================================== */
  const MT = 72;
  const MAZE = [
    "###############",
    "#S..#....C#..C#",
    "#.#.#.##.##.#.#",
    "#.#...#.....#.#",
    "#.###.#.###.#.#",
    "#C..#...#C..#.#",
    "###.###.#.###.#",
    "#C......#....D#",
    "###############",
  ];
  const MW = MAZE[0].length, MH = MAZE.length;
  let grid, bunny, totalCarrots = 0, doorOpen = false, doorT = 0, butterflies = [];
  let mz = { s: 1, x: 0, y: 0 };

  function startMaze() {
    grid = MAZE.map((r) => r.split(""));
    totalCarrots = 0; carrots = 0; doorOpen = false; doorT = 0;
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (grid[y][x] === "S") { bunny = { gx: x, gy: y, x: x * MT + MT / 2, y: y * MT + MT / 2, fx: 0, fy: 0, tx: 0, ty: 0, t: 1, face: 1, blink: 100, bump: 0 }; grid[y][x] = "."; }
      if (grid[y][x] === "C") totalCarrots++;
    }
    butterflies = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * MW * MT, y: Math.random() * MH * MT, ph: i * 1.7, col: [P.pink, P.lilac, P.yellow, P.blue][i] }));
    particles = [];
    setState("maze");
    playSong("maze");
  }
  function mazeLayout() {
    const availW = W - (isTouch && !portrait ? 520 * dpr : 0) - 20 * dpr;
    const availH = H - (isTouch && portrait ? 260 * dpr : 0) - 104 * dpr;
    mz.s = Math.min(availW / (MW * MT), availH / (MH * MT));
    mz.x = (W - MW * MT * mz.s) / 2;
    mz.y = 80 * dpr + (availH - MH * MT * mz.s) / 2;
  }
  const walkable = (x, y) => {
    const c = grid[y] && grid[y][x];
    if (!c || c === "#") return false;
    if (c === "D") return doorOpen;
    return true;
  };
  function updateMaze() {
    const b = bunny;
    if (--b.blink < 0) b.blink = 140 + Math.random() * 120;
    if (b.bump > 0) b.bump--;
    if (b.t < 1) {
      b.t = Math.min(1, b.t + 1 / 11);
      const e = b.t < 0.5 ? 2 * b.t * b.t : 1 - Math.pow(-2 * b.t + 2, 2) / 2;
      b.x = b.fx + (b.tx - b.fx) * e;
      b.y = b.fy + (b.ty - b.fy) * e;
      if (b.t === 1) arrive();
    }
    if (b.t >= 1 && state === "maze") {
      let dx = 0, dy = 0;
      if (keys.left) dx = -1; else if (keys.right) dx = 1; else if (keys.up) dy = -1; else if (keys.down) dy = 1;
      if (dx) b.face = dx;
      if (dx || dy) {
        if (walkable(b.gx + dx, b.gy + dy)) {
          b.fx = b.x; b.fy = b.y; b.gx += dx; b.gy += dy;
          b.tx = b.gx * MT + MT / 2; b.ty = b.gy * MT + MT / 2; b.t = 0;
          sfx.hop();
        } else if (b.bump === 0) { b.bump = 16; sfx.bump(); }
      }
    }
    if (doorOpen) doorT++;
    for (const f of butterflies) {
      f.ph += 0.02;
      f.x += Math.cos(f.ph * 0.7) * 1.2 + 0.4; f.y += Math.sin(f.ph) * 0.8;
      if (f.x > MW * MT + 40) f.x = -40;
    }
    if (state === "mazeExit") {
      b.scaleOut = (b.scaleOut || 1) - 0.03;
      if (frame % 4 === 0) particles.push({ mx: true, x: b.x, y: b.y - 30, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 4, life: 40, max: 40, col: P.pink2, r: 10, kind: "heart", rot: 0 });
      if (b.scaleOut <= 0) startMorph("whale");
    }
  }
  function arrive() {
    const b = bunny;
    const c = grid[b.gy][b.gx];
    if (c === "C") {
      grid[b.gy][b.gx] = ".";
      carrots++; sfx.munch();
      for (let i = 0; i < 12; i++) particles.push({ mx: true, x: b.x, y: b.y - 20, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 40, max: 40, col: i % 2 ? P.orange : P.mint2, r: 8, kind: "star", rot: Math.random() * TAU });
      if (carrots === totalCarrots) { doorOpen = true; doorT = 0; setTimeout(sfx.door, 300); }
    }
    if (c === "D" && doorOpen) { setState("mazeExit"); }
  }

  /* =====================================================================
     PANTALLA 3 — sorpresa: bajo el mar con Lila ballenita
     ===================================================================== */
  const SEA_END = 7600;
  let whale, seaCam = 0, seaItems = [], jellies = [], seaDone = 0;
  function startSea() {
    whale = { x: 220, y: 330, vy: 0, t: 0, blink: 100, tilt: 0, happy: 0 };
    seaCam = 0; seaDone = 0;
    seaItems = []; jellies = [];
    // caminos de burbujas en ondas suaves
    for (let x = 600; x < SEA_END - 500; x += 70) {
      const y = 340 + Math.sin(x / 420) * 170 + Math.sin(x / 150) * 30;
      if ((x / 70) % 9 < 6) seaItems.push({ kind: "bubble", x, y, taken: false, ph: Math.random() * TAU });
    }
    for (let x = 900; x < SEA_END - 600; x += 620) seaItems.push({ kind: "shell", x: x + Math.random() * 200, y: 625, taken: false, ph: 0 });
    for (let x = 1300; x < SEA_END - 700; x += 900) jellies.push({ x: x + Math.random() * 300, y0: 200 + Math.random() * 260, ph: Math.random() * TAU, col: Math.random() < 0.5 ? P.pink : P.lilac, giggle: 0 });
    particles = [];
    setState("sea");
    playSong("sea");
  }
  function updateSea() {
    const w = whale;
    w.t += 1;
    if (--w.blink < 0) w.blink = 140 + Math.random() * 120;
    if (w.happy > 0) w.happy--;
    if (seaCam < SEA_END - viewW) {
      seaCam += 2.6;
      if (keys.up || keys.jump) w.vy -= 0.55; else if (keys.down) w.vy += 0.5; else w.vy += 0.12;
      if ((keys.up || keys.jump) && frame % 14 === 0) sfx.swim();
      w.vy *= 0.94;
      w.vy = Math.max(-6, Math.min(6, w.vy));
      w.y += w.vy;
      if (w.y < 90) { w.y = 90; w.vy = 0; }
      if (w.y > 600) { w.y = 600; w.vy = 0; }
      w.tilt += (w.vy * 0.06 - w.tilt) * 0.1;
    } else {
      // al final, nada sola hasta el cofre del tesoro
      const chestX = SEA_END - 330, chestY = 560;
      const wx = seaCam + w.x;
      w.x += (chestX - 120 - wx) * 0.03;
      w.y += (chestY - 40 - w.y) * 0.03;
      w.tilt *= 0.9;
      seaDone++;
      if (seaDone === 90) { sfx.door(); for (let i = 0; i < 30; i++) particles.push({ x: chestX, y: chestY - 30, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 7 - 2, life: 60, max: 60, col: [P.yellow, P.pink2, P.lilac2, P.mint2][i % 4], r: 10, kind: i % 3 ? "star" : "heart", rot: 0 }); }
      if (seaDone > 200) startEnd();
    }
    const wx = seaCam + w.x;
    for (const it of seaItems) {
      if (it.taken) continue;
      if (Math.abs(it.x - wx) < 70 && Math.abs(it.y - w.y) < 55) {
        it.taken = true;
        if (it.kind === "bubble") { bubbles++; sfx.bubble(); for (let i = 0; i < 5; i++) sparkle(it.x, it.y, P.white); }
        else { shells++; sfx.heart(); w.happy = 40; for (let i = 0; i < 10; i++) sparkle(it.x, it.y, P.pink2, true); }
      }
    }
    for (const j of jellies) {
      if (j.giggle > 0) j.giggle--;
      const jy = j.y0 + Math.sin(frame * 0.02 + j.ph) * 60;
      if (j.giggle === 0 && Math.abs(j.x - wx) < 70 && Math.abs(jy - w.y) < 60) {
        j.giggle = 60; w.vy = w.y < jy ? -5 : 5; w.happy = 30; sfx.jelly();
        for (let i = 0; i < 6; i++) sparkle(j.x, jy, j.col, true);
      }
    }
    if (frame % 6 === 0) particles.push({ x: wx - 40, y: w.y - 10 + Math.random() * 20, vx: -1.2, vy: -0.8, life: 50, max: 50, col: "rgba(255,255,255,0.8)", r: 3 + Math.random() * 4, kind: "ring" });
  }

  /* =====================================================================
     FINAL
     ===================================================================== */
  function startEnd() {
    setState("end");
    playSong("end");
    sfx.win();
    confetti = [];
    for (let i = 0; i < 120; i++) confetti.push(newConfetti(true));
  }

  /* ---------- Partículas ---------- */
  function sparkle(x, y, col, heart) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5 - 1, life: 40, max: 40, col, r: 6 + Math.random() * 6, kind: heart ? "heart" : "star", rot: Math.random() * TAU });
  }
  function rainbowTrail(x, y, vx) {
    const cols = [P.pink, P.peach, P.yellow, P.mint, P.blue, P.lilac];
    particles.push({ x, y, vx, vy: 0.2, life: 30, max: 30, col: cols[(frame / 3) % 6 | 0], r: 6, kind: "dot" });
  }
  function newConfetti(burst) {
    const cols = [P.pink2, P.lilac2, P.yellow, P.mint2, P.blue, P.hot];
    const uiW = W / scale, uiH = H / scale;
    return {
      x: Math.random() * uiW, y: burst ? -Math.random() * 400 : -20, maxY: uiH + 40,
      vx: (Math.random() - 0.5) * 2, vy: 1.5 + Math.random() * 2.5,
      rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.2,
      col: cols[(Math.random() * cols.length) | 0], heart: Math.random() < 0.3, life: 500,
    };
  }
  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.kind !== "dot" && p.kind !== "ring") p.vy += 0.15;
      p.life--; if (p.rot !== undefined) p.rot += 0.1;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const c of confetti) { c.x += c.vx + Math.sin((frame + c.rot * 50) * 0.05) * 0.8; c.y += c.vy; c.rot += c.vr; c.life--; }
    confetti = confetti.filter((c) => c.life > 0 && c.y < c.maxY);
    if (state === "end" && confetti.length < 140 && frame % 2 === 0) confetti.push(newConfetti(false));
  }

  /* ---------- Bucle de lógica ---------- */
  function update() {
    frame++; stateT++;
    updateParticles();
    switch (state) {
      case "title": cam += 1.2; if (cam > END - viewW) cam = 0; break;
      case "plat": updatePlat(); break;
      case "castle": updateCastle(); break;
      case "morph": updateMorph(); break;
      case "maze": case "mazeExit": updateMaze(); break;
      case "sea": updateSea(); break;
    }
    if (jumpBuffer > 0 && state !== "plat") jumpBuffer--;
  }

  /* =====================================================================
     DIBUJO
     ===================================================================== */
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
  function label(text, x, y, size, fill = P.white, stroke = INK, align = "center") {
    ctx.font = `700 ${size}px "Fredoka", "Comic Sans MS", sans-serif`;
    ctx.textAlign = align; ctx.textBaseline = "middle";
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = stroke; ctx.lineJoin = "round";
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }
  function kawaiiEye(x, y, rx, ry, blinking) {
    if (blinking) {
      ctx.beginPath(); ctx.arc(x, y + 1, rx, 0.1 * Math.PI, 0.9 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
      return;
    }
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
    circle(x + rx * 0.3, y - ry * 0.4, rx * 0.42); ctx.fillStyle = P.white; ctx.fill();
    circle(x - rx * 0.3, y + ry * 0.35, rx * 0.2); ctx.fill();
  }

  /* ---------- Fondo de cielo (pantallas 1 y transición) ---------- */
  const bgClouds = Array.from({ length: 9 }, (_, i) => ({ x: i * 420 + Math.random() * 200, y: 60 + Math.random() * 220, s: 0.7 + Math.random() * 0.6 }));
  function drawSky(camX) {
    const g = ctx.createLinearGradient(0, -offY, 0, VH);
    g.addColorStop(0, P.sky1); g.addColorStop(0.75, P.sky2); g.addColorStop(1, "#fff0e6");
    ctx.fillStyle = g;
    ctx.fillRect(0, -offY, viewW, viewH);
    const sx = viewW - 140, sy = 120;
    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(frame * 0.004);
    ctx.fillStyle = "#ffe89a";
    for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); rr(-7, -88, 14, 26, 7); ctx.fill(); }
    ctx.restore();
    circle(sx, sy, 56); ctx.fillStyle = P.yellow; ctx.fill(); outline(4);
    face(sx, sy, 40);
    const rx = 900 - (camX * 0.08) % 3000;
    const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
    ctx.lineWidth = 16;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(rx, 520, 300 - i * 16, Math.PI, TAU); ctx.stroke(); });
    ctx.globalAlpha = 1;
    for (const c of bgClouds) {
      const x = ((c.x - camX * 0.15 + frame * 0.15) % 3600 + 3600) % 3600 - 300;
      if (x > viewW + 200) continue;
      puff(x, c.y, 110 * c.s, 0.85);
    }
    hills(camX, 0.2, 470, 70, "#e6d6ff", 0.004);
    hills(camX, 0.4, 540, 50, "#c9f0dd", 0.006);
  }
  function hills(camX, par, base, amp, col, freq) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, VH + 900);
    for (let x = 0; x <= viewW + 20; x += 20) {
      const wx = x + camX * par;
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

  /* ---------- Pantalla 1: mundo ---------- */
  function drawGround() {
    for (const s of ground) {
      const x = s.x - cam;
      if (x > viewW + 20 || x + s.w < -20) continue;
      rr(x, s.y, s.w, VH - s.y + 900, 22);
      ctx.fillStyle = P.cream; ctx.fill(); outline(4);
      ctx.fillStyle = "#ffd9b8";
      for (let gx = Math.ceil(s.x / 50) * 50; gx < s.x + s.w - 20; gx += 50) {
        for (let gy = s.y + 70; gy < VH + 400; gy += 55) {
          const o = ((gx / 50) % 2) * 25;
          circle(gx - cam + o + 10, gy, 6); ctx.fill();
        }
      }
      ctx.fillStyle = P.mint;
      ctx.beginPath();
      ctx.moveTo(x + 22, s.y);
      ctx.lineTo(x + s.w - 22, s.y);
      ctx.arcTo(x + s.w, s.y, x + s.w, s.y + 22, 22);
      ctx.lineTo(x + s.w, s.y + 26);
      const n = Math.max(2, Math.round(s.w / 30));
      const step = s.w / n;
      for (let i = n; i > 0; i--) ctx.arc(x + (i - 0.5) * step, s.y + 26, step / 2, 0, Math.PI, false);
      ctx.lineTo(x, s.y + 22);
      ctx.arcTo(x, s.y, x + 22, s.y, 22);
      ctx.closePath();
      ctx.fill(); outline(4);
      for (let fx = s.x + 40; fx < s.x + s.w - 30; fx += 170) flower(fx - cam + ((fx * 7) % 60), s.y - 4, (fx / 170) % 3 | 0);
    }
  }
  function flower(x, y, k, size = 1) {
    const col = [P.pink, P.lilac, P.yellow][k];
    ctx.strokeStyle = P.mint2; ctx.lineWidth = 4 * size;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 18 * size); ctx.stroke();
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + frame * 0.01; circle(x + Math.cos(a) * 8 * size, y - 24 * size + Math.sin(a) * 8 * size, 6 * size); ctx.fill(); }
    circle(x, y - 24 * size, 5 * size); ctx.fillStyle = "#fff6a8"; ctx.fill();
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
      rr(x + 8, c.y - 4 + bob, c.w - 16, 30, 14); ctx.fillStyle = P.white; ctx.fill();
      face(x + c.w / 2, c.y + 12 + bob, 18);
    }
  }
  function drawSprings() {
    for (const s of springs) {
      const x = s.x - cam;
      if (x > viewW + 40 || x + s.w < -40) continue;
      const sq = s.squash > 0 ? Math.sin((s.squash / 14) * Math.PI) * 10 : 0;
      rr(x + 14, s.y + 12 + sq, 20, 22 - sq, 8); ctx.fillStyle = P.cream; ctx.fill(); outline(4);
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
  function drawStar(x, y, r = 22, ph = 0) {
    starPath(x, y, r, -Math.PI / 2 + Math.sin(frame * 0.04 + ph) * 0.15);
    ctx.fillStyle = P.yellow; ctx.fill(); outline(3.5);
    face(x, y + 2, r * 0.6);
  }
  function drawHeart(x, y, s) {
    heartPath(x, y, s);
    ctx.fillStyle = P.hot; ctx.fill(); outline(3.5);
    circle(x - s * 0.4, y - s * 0.3, s * 0.15); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fill();
  }
  function drawItems() {
    for (const it of items) {
      if (it.taken) continue;
      const x = it.x - cam;
      if (x < -40 || x > viewW + 40) continue;
      const y = it.y + Math.sin(frame * 0.06 + it.ph) * 5;
      if (it.kind === "star") drawStar(x, y, 22, it.ph);
      else drawHeart(x, y, 18 + Math.sin(frame * 0.12 + it.ph) * 2);
    }
  }
  function drawCastle() {
    const x = CASTLE - cam;
    if (x > viewW + 50 || x < -500) return;
    const base = 10 * T;
    const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
    ctx.lineWidth = 20;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(x + 160, base, 300 - i * 20, Math.PI, TAU); ctx.stroke(); });
    const tower = (tx, w, h, roof) => {
      rr(tx, base - h, w, h, 10); ctx.fillStyle = "#ffd3ea"; ctx.fill(); outline(4);
      ctx.beginPath(); ctx.moveTo(tx - 10, base - h + 4); ctx.lineTo(tx + w / 2, base - h - roof); ctx.lineTo(tx + w + 10, base - h + 4); ctx.closePath();
      ctx.fillStyle = P.lilac; ctx.fill(); outline(4);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx + w / 2, base - h - roof); ctx.lineTo(tx + w / 2, base - h - roof - 26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + w / 2, base - h - roof - 26); ctx.lineTo(tx + w / 2 + 22, base - h - roof - 20 + Math.sin(frame * 0.1) * 3); ctx.lineTo(tx + w / 2, base - h - roof - 14); ctx.closePath();
      ctx.fillStyle = P.hot; ctx.fill(); outline(3);
      heartPath(tx + w / 2, base - h * 0.6, 10); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    };
    tower(x + 20, 70, 220, 80);
    tower(x + 250, 70, 220, 80);
    tower(x + 110, 110, 280, 110);
    rr(x + 60, base - 160, 220, 160, 14); ctx.fillStyle = "#ffe4f2"; ctx.fill(); outline(4);
    ctx.beginPath(); ctx.moveTo(x + 135, base); ctx.lineTo(x + 135, base - 60); ctx.arc(x + 170, base - 60, 35, Math.PI, TAU); ctx.lineTo(x + 205, base); ctx.closePath();
    ctx.fillStyle = state === "castle" ? "#fff2a8" : P.lilac2; ctx.fill(); outline(4);
    if (state !== "castle") { circle(x + 192, base - 40, 4); ctx.fillStyle = P.yellow; ctx.fill(); }
  }

  /* ---------- Personajes ---------- */
  function drawLila(L, sx, sy, sc = 1) {
    const t = L.walk;
    const moving = Math.abs(L.vx) > 0.3;
    const air = !L.onGround && state === "plat";
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
      ctx.fillStyle = far ? P.lilac3 : P.white; ctx.fill(); outline(3.5);
      rr(lx - 8 + swing, -8 - lift, 16, 9, 4);
      ctx.fillStyle = P.lilac2; ctx.fill(); outline(3.5);
    };
    const wag = Math.sin(frame * 0.12) * 4;
    [[-46, -42, 12, P.lilac], [-56, -32 + wag, 11, P.pink], [-60, -18 + wag, 10, P.lilac2], [-54, -8 + wag, 8, P.pink]].forEach(([x, y, r, c]) => {
      circle(x, y, r); ctx.fillStyle = c; ctx.fill(); outline(3);
    });
    leg(-22, Math.PI, true); leg(18, 0, true);
    ctx.beginPath(); ctx.ellipse(0, -40, 40, 25, 0, 0, TAU);
    ctx.fillStyle = P.white; ctx.fill(); outline(4);
    heartPath(-12, -42, 7); ctx.fillStyle = P.pink; ctx.fill();
    leg(-12, 0, false); leg(28, Math.PI, false);
    ctx.beginPath();
    ctx.moveTo(14, -50); ctx.quadraticCurveTo(22, -70, 28, -78); ctx.lineTo(44, -66); ctx.quadraticCurveTo(38, -52, 34, -44); ctx.closePath();
    ctx.fillStyle = P.white; ctx.fill();
    circle(34, -80, 26); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.beginPath(); ctx.ellipse(54, -70, 17, 14, 0.2, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    circle(34, -80, 24.5); ctx.fillStyle = P.white; ctx.fill();
    ctx.beginPath(); ctx.moveTo(14, -50); ctx.quadraticCurveTo(22, -70, 26, -76); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    circle(62, -72, 2.5); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); ctx.arc(55, -66, 6, 0.2 * Math.PI, 0.8 * Math.PI); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, -98); ctx.lineTo(16, -118); ctx.lineTo(32, -104); ctx.closePath();
    ctx.fillStyle = P.white; ctx.fill(); outline(3.5);
    ctx.beginPath(); ctx.moveTo(21, -102); ctx.lineTo(19, -112); ctx.lineTo(27, -105); ctx.closePath(); ctx.fillStyle = P.pink; ctx.fill();
    ctx.save(); ctx.translate(40, -102); ctx.rotate(0.35);
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -34); ctx.lineTo(8, 0); ctx.closePath();
    ctx.fillStyle = P.gold; ctx.fill(); outline(3.5);
    ctx.strokeStyle = "#ffb347"; ctx.lineWidth = 2.5;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 1.8, -i * 8); ctx.lineTo(8 - i * 1.8, -i * 8 - 4); ctx.stroke(); }
    ctx.restore();
    const bounce = moving ? Math.sin(t * 2) * 2 : Math.sin(frame * 0.05) * 1.5;
    [[12, -100, 12, P.lilac], [4, -86, 12, P.pink], [2, -70, 11, P.lilac2], [6, -56, 10, P.lilac], [24, -108, 9, P.pink]].forEach(([x, y, r, c], i) => {
      circle(x, y + (i % 2 ? bounce : -bounce), r); ctx.fillStyle = c; ctx.fill(); outline(3);
    });
    if (L.blink < 8) {
      ctx.beginPath(); ctx.arc(42, -80, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 3.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(42, -82, 7.5, 10, 0, 0, TAU); ctx.fillStyle = INK; ctx.fill();
      circle(44.5, -86, 3.2); ctx.fillStyle = P.white; ctx.fill();
      circle(40, -78, 1.6); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(46, -90); ctx.lineTo(51, -95); ctx.moveTo(43, -92); ctx.lineTo(45, -98); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(48, -66, 7, 4.5, 0, 0, TAU); ctx.fillStyle = "rgba(255,140,198,0.65)"; ctx.fill();
    ctx.restore();
  }

  // conejito blanco con lazo lila; (x, y) es el punto entre las patitas
  function drawBunny(x, y, faceDir, hop, blink, sc = 1) {
    ctx.save();
    ctx.translate(x, y - hop);
    ctx.scale(sc, sc);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const f = faceDir * 3;
    // colita
    circle(-26 * faceDir, -22, 9); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    // patitas
    ctx.beginPath(); ctx.ellipse(-12, -4, 10, 7, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(3);
    ctx.beginPath(); ctx.ellipse(12, -4, 10, 7, 0, 0, TAU); ctx.fill(); outline(3);
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, -24, 25, 21, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.beginPath(); ctx.ellipse(0, -20, 13, 12, 0, 0, TAU); ctx.fillStyle = P.lilac3; ctx.fill();
    // orejas (una se dobla al saltar)
    const flop = hop > 3 ? 0.35 : 0.1;
    [[-10, -0.18 - flop], [10, 0.18]].forEach(([ex, rot]) => {
      ctx.save(); ctx.translate(ex + f, -70); ctx.rotate(rot);
      ctx.beginPath(); ctx.ellipse(0, -20, 8.5, 22, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(3.5);
      ctx.beginPath(); ctx.ellipse(0, -19, 4.5, 15, 0, 0, TAU); ctx.fillStyle = P.pink; ctx.fill();
      ctx.restore();
    });
    // cabeza
    ctx.beginPath(); ctx.ellipse(f, -56, 25, 22, 0, 0, TAU); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    // lazo lila
    ctx.save(); ctx.translate(f + 2, -78);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -9); ctx.lineTo(-14, 9); ctx.closePath(); ctx.fillStyle = P.lilac2; ctx.fill(); outline(3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -9); ctx.lineTo(14, 9); ctx.closePath(); ctx.fill(); outline(3);
    circle(0, 0, 5); ctx.fillStyle = P.lilac; ctx.fill(); outline(3);
    ctx.restore();
    // cara
    kawaiiEye(f - 9, -58, 4.5, 6, blink);
    kawaiiEye(f + 9, -58, 4.5, 6, blink);
    ctx.beginPath(); ctx.moveTo(f - 3, -50); ctx.lineTo(f + 3, -50); ctx.lineTo(f, -47); ctx.closePath(); ctx.fillStyle = P.pink2; ctx.fill();
    ctx.beginPath(); ctx.arc(f - 3, -46, 3, 0, Math.PI); ctx.arc(f + 3, -46, 3, 0, Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "rgba(255,140,198,0.6)";
    ctx.beginPath(); ctx.ellipse(f - 17, -50, 5, 3.5, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(f + 17, -50, 5, 3.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ballenita lila; (x, y) es el centro
  function drawWhale(x, y, t, tilt, blink, happy, sc = 1) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(sc, sc);
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    // cola
    const wag = Math.sin(t * 0.15) * 0.3;
    ctx.save(); ctx.translate(-50, -4); ctx.rotate(wag);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-18, -26, -36, -24); ctx.quadraticCurveTo(-26, -6, -22, 0); ctx.quadraticCurveTo(-26, 6, -36, 24); ctx.quadraticCurveTo(-18, 26, 0, 0); ctx.closePath();
    ctx.fillStyle = P.lilac; ctx.fill(); outline(3.5);
    ctx.restore();
    // cuerpo
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 40, 0, 0, TAU); ctx.fillStyle = P.lilac; ctx.fill(); outline(4);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 56, 38, 0, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.ellipse(6, 30, 50, 22, 0, 0, TAU); ctx.fillStyle = P.lilac3; ctx.fill();
    ctx.strokeStyle = P.lilac; ctx.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 12, 12); ctx.lineTo(6 + i * 12, 40); ctx.stroke(); }
    ctx.restore();
    // aleta
    ctx.save(); ctx.translate(-4, 14); ctx.rotate(0.5 + Math.sin(t * 0.2) * 0.25);
    ctx.beginPath(); ctx.ellipse(0, 10, 9, 16, 0, 0, TAU); ctx.fillStyle = P.lilac2; ctx.fill(); outline(3);
    ctx.restore();
    // corazoncito en la espalda
    heartPath(-14, -22, 7); ctx.fillStyle = P.pink; ctx.fill();
    // cara
    kawaiiEye(30, -6, 6.5, 8.5, blink);
    ctx.beginPath(); ctx.arc(42, 8, 7, 0.1 * Math.PI, 0.8 * Math.PI); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    if (happy) { ctx.beginPath(); ctx.arc(42, 9, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fillStyle = P.hot; ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(38, 4, 7, 4.5, 0, 0, TAU); ctx.fillStyle = "rgba(255,140,198,0.7)"; ctx.fill();
    // chorrito
    const sp = (t % 90) / 90;
    if (sp < 0.6) {
      ctx.fillStyle = P.blue; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      [[-6, -1], [0, -1.3], [6, -1]].forEach(([dx, dy]) => {
        circle(10 + dx * (1 + sp * 2), -42 + dy * sp * 40, 5); ctx.fill(); ctx.stroke();
      });
    }
    ctx.restore();
  }

  /* ---------- Pantalla 2: laberinto ---------- */
  function drawMaze() {
    mazeLayout();
    // fondo
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#d8f5e6"); g.addColorStop(1, "#fbe3f1");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(mz.s, 0, 0, mz.s, mz.x, mz.y);
    // suelo
    rr(-10, -10, MW * MT + 20, MH * MT + 20, 30); ctx.fillStyle = "#c6efd8"; ctx.fill(); outline(5);
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if ((x + y) % 2 === 0 && grid[y][x] !== "#") { ctx.fillStyle = "#d6f6e3"; ctx.fillRect(x * MT, y * MT, MT, MT); }
      if (grid[y][x] === "." && (x * 7 + y * 13) % 5 === 0) {
        ctx.save(); ctx.translate(x * MT + 18 + ((x * 11) % 30), y * MT + MT - 10); flower(0, 0, (x + y) % 3, 0.6); ctx.restore();
      }
    }
    // setos
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      if (grid[y][x] !== "#") continue;
      const px = x * MT, py = y * MT;
      rr(px + 2, py + 6, MT - 4, MT - 6, 18); ctx.fillStyle = "#7fd3a8"; ctx.fill(); outline(4);
      ctx.fillStyle = "#9fe3bf";
      circle(px + 22, py + 22, 15); ctx.fill(); circle(px + 48, py + 26, 13); ctx.fill();
      if ((x * 5 + y * 3) % 4 === 0) { circle(px + 50, py + 18, 6); ctx.fillStyle = P.pink; ctx.fill(); circle(px + 50, py + 18, 2.5); ctx.fillStyle = P.yellow; ctx.fill(); }
      if ((x * 3 + y * 7) % 5 === 0) { circle(px + 20, py + 44, 5); ctx.fillStyle = P.lilac; ctx.fill(); }
    }
    // zanahorias y puerta
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const c = grid[y][x];
      const cx = x * MT + MT / 2, cy = y * MT + MT / 2;
      if (c === "C") drawCarrot(cx, cy + Math.sin(frame * 0.08 + x) * 4, 1);
      if (c === "D") drawDoor(cx, cy);
    }
    // mariposas
    for (const f of butterflies) {
      const flap = Math.abs(Math.sin(frame * 0.3 + f.ph));
      ctx.fillStyle = f.col;
      ctx.beginPath(); ctx.ellipse(f.x - 7, f.y, 8 * flap + 2, 10, -0.3, 0, TAU); ctx.fill(); outline(2.5);
      ctx.beginPath(); ctx.ellipse(f.x + 7, f.y, 8 * flap + 2, 10, 0.3, 0, TAU); ctx.fill(); outline(2.5);
    }
    // conejito
    const b = bunny;
    const hop = b.t < 1 ? Math.sin(b.t * Math.PI) * 14 : 0;
    const shake = b.bump > 0 ? Math.sin(b.bump * 1.5) * 3 : 0;
    ctx.fillStyle = "rgba(91,67,112,0.15)";
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 22, 22 - hop * 0.5, 7, 0, 0, TAU); ctx.fill();
    drawBunny(b.x + shake, b.y + 24, b.face, hop, b.blink < 8, (b.scaleOut === undefined ? 1 : Math.max(0, b.scaleOut)) * 0.92);
    drawParticles((p) => p.mx);
    // marcador de zanahorias
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const uiW = W / scale;
    const n = totalCarrots, w = 70 * n + 30;
    rr(uiW / 2 - w / 2, 14, w, 74, 37); ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill(); outline(4);
    for (let i = 0; i < n; i++) {
      const x = uiW / 2 - w / 2 + 50 + i * 70;
      if (i < carrots) drawCarrot(x, 51, 0.8);
      else { ctx.globalAlpha = 0.25; drawCarrot(x, 51, 0.8); ctx.globalAlpha = 1; }
    }
  }
  function drawCarrot(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(0.25);
    ctx.fillStyle = P.mint2;
    [[-8, -0.5], [0, 0], [8, 0.5]].forEach(([dx, r]) => { ctx.save(); ctx.translate(dx * 0.6, -18); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -8, 5, 11, 0, 0, TAU); ctx.fill(); outline(3); ctx.restore(); });
    ctx.beginPath(); ctx.moveTo(-14, -16); ctx.quadraticCurveTo(0, -24, 14, -16); ctx.quadraticCurveTo(6, 10, 0, 26); ctx.quadraticCurveTo(-6, 10, -14, -16); ctx.closePath();
    ctx.fillStyle = P.orange; ctx.fill(); outline(3.5);
    ctx.strokeStyle = "#e88a3a"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(2, -2); ctx.moveTo(-3, 10); ctx.lineTo(4, 8); ctx.stroke();
    face(0, -6, 12);
    ctx.restore();
  }
  function drawDoor(cx, cy) {
    if (!doorOpen) {
      rr(cx - 30, cy - 32, 60, 64, 26); ctx.fillStyle = P.pink; ctx.fill(); outline(4);
      ctx.strokeStyle = P.hot; ctx.lineWidth = 4;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 14, cy - 26); ctx.lineTo(cx + i * 14, cy + 28); ctx.stroke(); }
      heartPath(cx, cy, 13); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
      circle(cx, cy + 2, 3); ctx.fillStyle = INK; ctx.fill();
    } else {
      // portal de arcoíris
      const cols = [P.pink2, P.peach, P.yellow, P.mint2, P.blue, P.lilac2];
      const grow = Math.min(1, doorT / 30);
      for (let i = 0; i < 6; i++) {
        circle(cx, cy, (34 - i * 5) * grow); ctx.fillStyle = cols[(i + (frame / 6 | 0)) % 6]; ctx.fill();
      }
      circle(cx, cy, 34 * grow); outline(4);
      if (frame % 8 === 0) particles.push({ mx: true, x: cx + (Math.random() - 0.5) * 50, y: cy, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 2, life: 40, max: 40, col: cols[(Math.random() * 6) | 0], r: 7, kind: "star", rot: 0 });
    }
  }

  /* ---------- Pantalla 3: mar ---------- */
  const fishes = Array.from({ length: 10 }, (_, i) => ({ x: Math.random() * 2000, y: 120 + Math.random() * 380, s: 0.5 + Math.random() * 0.5, col: [P.peach, P.yellow, P.pink, P.mint][i % 4], v: 0.4 + Math.random() * 0.6 }));
  function drawSea() {
    setWorld();
    const g = ctx.createLinearGradient(0, -offY, 0, VH);
    g.addColorStop(0, "#c9f0ff"); g.addColorStop(0.5, P.sea1); g.addColorStop(1, P.sea2);
    ctx.fillStyle = g; ctx.fillRect(0, -offY, viewW, viewH);
    // rayos de luz
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 300 - seaCam * 0.1) % 1500 + 1500) % 1500 - 200;
      ctx.beginPath(); ctx.moveTo(x, -offY); ctx.lineTo(x + 80, -offY); ctx.lineTo(x + 240, VH); ctx.lineTo(x + 120, VH); ctx.closePath(); ctx.fill();
    }
    // peces del fondo
    for (const f of fishes) {
      const x = ((f.x - seaCam * 0.3 - frame * f.v) % 2400 + 2400) % 2400 - 200;
      if (x > viewW + 50) continue;
      ctx.globalAlpha = 0.6;
      ctx.save(); ctx.translate(x, f.y + Math.sin(frame * 0.03 + f.x) * 10); ctx.scale(-f.s, f.s);
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 14, 0, 0, TAU); ctx.fillStyle = f.col; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-34, -12); ctx.lineTo(-34, 12); ctx.closePath(); ctx.fill();
      circle(10, -3, 3); ctx.fillStyle = INK; ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // arena y algas
    ctx.fillStyle = P.sand;
    ctx.beginPath(); ctx.moveTo(0, VH + 900);
    for (let x = 0; x <= viewW + 20; x += 20) ctx.lineTo(x, 655 + Math.sin((x + seaCam) * 0.01) * 10);
    ctx.lineTo(viewW, VH + 900); ctx.closePath(); ctx.fill(); outline(4);
    for (let wx = Math.floor(seaCam / 160) * 160; wx < seaCam + viewW + 160; wx += 160) {
      const x = wx - seaCam + ((wx * 7) % 50);
      const k = (wx / 160) % 3;
      if (k === 0) seaweed(x, 660);
      else if (k === 1) coral(x, 665);
      else { ctx.fillStyle = "#ffd6e8"; circle(x, 668, 8); ctx.fill(); outline(3); }
    }
    // cofre del tesoro al final
    const chestX = SEA_END - 330 - seaCam;
    if (chestX < viewW + 100) drawChest(chestX, 600, seaDone > 90);
    // objetos
    for (const it of seaItems) {
      if (it.taken) continue;
      const x = it.x - seaCam;
      if (x < -40 || x > viewW + 40) continue;
      const y = it.y + Math.sin(frame * 0.05 + it.ph) * 6;
      if (it.kind === "bubble") drawBubble(x, y, 18);
      else drawShell(x, y);
    }
    for (const j of jellies) {
      const x = j.x - seaCam;
      if (x < -80 || x > viewW + 80) continue;
      drawJelly(x, j.y0 + Math.sin(frame * 0.02 + j.ph) * 60, j.col, j.giggle);
    }
    drawWhale(whale.x, whale.y, whale.t, whale.tilt, whale.blink < 8, whale.happy > 0);
    drawParticles((p) => !p.mx && !p.ui, seaCam);
    // marcador
    setUI();
    rr(20, 16, 190, 64, 32); ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill(); outline(4);
    drawBubble(58, 48, 20);
    label(String(bubbles), 130, 50, 32);
    if (shells) {
      rr(222, 16, 130, 64, 32); ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.fill(); outline(4);
      drawShell(262, 50);
      label(String(shells), 314, 50, 32);
    }
  }
  function seaweed(x, y) {
    ctx.strokeStyle = P.mint2; ctx.lineWidth = 10;
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath(); ctx.moveTo(x + k * 8, y);
      for (let i = 1; i <= 5; i++) ctx.lineTo(x + k * 8 + Math.sin(frame * 0.04 + i + k) * 8, y - i * 18);
      ctx.stroke();
    }
  }
  function coral(x, y) {
    ctx.strokeStyle = P.pink2; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 50); ctx.moveTo(x, y - 25); ctx.lineTo(x - 18, y - 45); ctx.moveTo(x, y - 30); ctx.lineTo(x + 18, y - 52); ctx.stroke();
    ctx.fillStyle = P.pink2; [[x, y - 50], [x - 18, y - 45], [x + 18, y - 52]].forEach(([a, b]) => { circle(a, b, 6); ctx.fill(); });
  }
  function drawBubble(x, y, r) {
    circle(x, y, r);
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,0.95)"); g.addColorStop(0.5, "rgba(230,214,255,0.6)"); g.addColorStop(1, "rgba(255,182,217,0.7)");
    ctx.fillStyle = g; ctx.fill(); outline(3);
    circle(x - r * 0.35, y - r * 0.35, r * 0.22); ctx.fillStyle = P.white; ctx.fill();
  }
  function drawShell(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-22, 8); ctx.quadraticCurveTo(-24, -22, 0, -24); ctx.quadraticCurveTo(24, -22, 22, 8); ctx.closePath();
    ctx.fillStyle = "#ffcfe3"; ctx.fill(); outline(3.5);
    ctx.strokeStyle = P.pink2; ctx.lineWidth = 2.5;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 4, 8); ctx.lineTo(i * 9, -18); ctx.stroke(); }
    rr(-10, 6, 20, 8, 4); ctx.fillStyle = "#ffcfe3"; ctx.fill(); outline(3);
    ctx.restore();
  }
  function drawJelly(x, y, col, giggle) {
    const sq = giggle > 0 ? Math.sin(giggle * 0.5) * 0.12 : Math.sin(frame * 0.06) * 0.05;
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + sq, 1 - sq);
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 9, 10);
      for (let k = 1; k <= 4; k++) ctx.lineTo(i * 9 + Math.sin(frame * 0.1 + k + i) * 5, 10 + k * 11);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 10, 32, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); outline(4);
    face(0, -6, 22, true);
    ctx.restore();
  }
  function drawChest(x, y, open) {
    ctx.save(); ctx.translate(x, y);
    if (open) {
      ctx.fillStyle = "rgba(255,240,150,0.5)";
      ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(40, -30); ctx.lineTo(90, -260); ctx.lineTo(-90, -260); ctx.closePath(); ctx.fill();
    }
    rr(-56, -34, 112, 74, 14); ctx.fillStyle = "#ffcf8a"; ctx.fill(); outline(4);
    ctx.save(); ctx.translate(0, -34); if (open) ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(-56, 0); ctx.quadraticCurveTo(-56, -40, 0, -42); ctx.quadraticCurveTo(56, -40, 56, 0); ctx.closePath();
    ctx.fillStyle = P.pink2; ctx.fill(); outline(4);
    ctx.restore();
    rr(-12, -40, 24, 26, 6); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
    heartPath(0, 6, 12); ctx.fillStyle = P.hot; ctx.fill(); outline(3);
    if (open) { drawStar(-20, -70, 20); drawHeart(24, -78, 16); drawBubble(4, -110, 14); }
    ctx.restore();
  }

  /* ---------- Partículas y pantallas especiales ---------- */
  function drawParticles(filter, camX = cam) {
    for (const p of particles) {
      if (filter && !filter(p)) continue;
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      const x = p.mx || p.ui ? p.x : p.x - camX;
      if (p.kind === "dot") { circle(x, p.y, p.r * (0.5 + a * 0.5)); ctx.fillStyle = p.col; ctx.fill(); }
      else if (p.kind === "ring") { circle(x, p.y, p.r); ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.stroke(); }
      else if (p.kind === "heart") { heartPath(x, p.y, p.r * 0.7); ctx.fillStyle = p.col; ctx.fill(); }
      else { starPath(x, p.y, p.r, p.rot); ctx.fillStyle = p.col; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
  function drawConfetti() {
    for (const c of confetti) {
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
      if (c.heart) heartPath(0, 0, 9); else rr(-6, -4, 12, 8, 3);
      ctx.fillStyle = c.col; ctx.fill();
      ctx.restore();
    }
  }
  function pastelBackdrop() {
    setUI();
    const uiW = W / scale, uiH = H / scale;
    const g = ctx.createRadialGradient(uiW / 2, uiH / 2, 50, uiW / 2, uiH / 2, Math.max(uiW, uiH) * 0.7);
    g.addColorStop(0, "#fff6fb"); g.addColorStop(0.5, "#f3e6ff"); g.addColorStop(1, "#d9efff");
    ctx.fillStyle = g; ctx.fillRect(0, 0, uiW, uiH);
    // rayos girando
    ctx.save(); ctx.translate(uiW / 2, uiH / 2); ctx.rotate(frame * 0.004);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 12; i++) { ctx.rotate(TAU / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-60, -2000); ctx.lineTo(60, -2000); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    return { uiW, uiH };
  }
  function drawMorph() {
    const { uiW, uiH } = pastelBackdrop();
    const cx = uiW / 2, cy = uiH / 2 + 60;
    const t = stateT;
    if (t < 70) {
      // el personaje anterior gira y se encoge
      const k = 1 - t / 70;
      ctx.save(); ctx.translate(cx, cy - 40); ctx.rotate(t * 0.15); ctx.translate(-cx, -(cy - 40));
      if (morph.from === "unicorn") drawLila({ vx: 0, face: 1, onGround: true, squash: 0, walk: 0, blink: 100 }, cx - 10, cy, 1.6 * k);
      else drawBunny(cx, cy, 1, 0, false, 1.9 * k);
      ctx.restore();
    } else {
      // ¡puf! nube y aparece el nuevo personaje
      const k = Math.min(1, (t - 70) / 30);
      const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1 + Math.sin(t * 0.1) * 0.03;
      if (t < 110) { ctx.globalAlpha = 1 - (t - 70) / 40; puff(cx - 150, cy - 30, 300, 1); ctx.globalAlpha = 1; }
      if (morph.to === "bunny") drawBunny(cx, cy - Math.abs(Math.sin(t * 0.12)) * 30, Math.sin(t * 0.05) > 0 ? 1 : -1, 0, false, 1.9 * k * pop);
      else drawWhale(cx, cy - 60 + Math.sin(t * 0.06) * 12, t, Math.sin(t * 0.05) * 0.1, false, true, 1.6 * k * pop);
      if (t > 90) label(morph.to === "bunny" ? "¡Ahora eres un conejito!" : "¡Ahora eres una ballenita!", cx, Math.max(90, cy - 260), Math.min(56, uiW / 14), P.pink, INK);
    }
    ctx.save(); ctx.translate(cx, cy - 40);
    drawParticles((p) => p.ui);
    ctx.restore();
  }
  function drawEnd() {
    const { uiW, uiH } = pastelBackdrop();
    const cx = uiW / 2;
    const base = Math.min(uiH - 60, uiH / 2 + 220);
    rr(-20, base, uiW + 40, 400, 40); ctx.fillStyle = P.mint; ctx.fill(); outline(4);
    const t = stateT;
    const sp = Math.min(220, uiW / 4.2);
    drawLila({ vx: 2, face: 1, onGround: true, squash: 0, walk: t * 0.08, blink: t % 180 }, cx - sp, base - Math.abs(Math.sin(t * 0.1)) * 30, 1.1);
    drawBunny(cx, base - Math.abs(Math.sin(t * 0.1 + 1)) * 34, Math.floor(t / 50) % 2 ? 1 : -1, 0, t % 200 < 8, 1.3);
    drawWhale(cx + sp, base - 70 + Math.sin(t * 0.08) * 14, t, Math.sin(t * 0.05) * 0.1, t % 170 < 8, true, 1);
    const top = Math.max(30, base - 470);
    label("¡Fin!", cx, top + 60, 96, P.lilac, INK);
    label("¡Eres genial!", cx, top + 140, 50, P.pink, INK);
    // resumen
    const row = top + 215;
    const items = [["star", stars], ["heart", hearts], ["carrot", carrots], ["bubble", bubbles]];
    const gap = Math.min(150, uiW / 4.5);
    items.forEach(([k, n], i) => {
      const x = cx + (i - 1.5) * gap;
      if (k === "star") drawStar(x - 26, row, 22);
      else if (k === "heart") drawHeart(x - 26, row, 18);
      else if (k === "carrot") drawCarrot(x - 26, row, 0.8);
      else drawBubble(x - 26, row, 18);
      label(String(n), x + 22, row + 2, 32);
    });
    drawConfetti();
    if (t > 150) {
      // botón de volver a jugar, sobre la hierba, debajo de los tres amigos
      const by = Math.min(base + 85, uiH - 52), pulse = 1 + Math.sin(frame * 0.1) * 0.06;
      ctx.save(); ctx.translate(cx, by); ctx.scale(pulse, pulse);
      circle(0, 0, 44); ctx.fillStyle = P.hot; ctx.fill(); outline(5);
      ctx.beginPath(); ctx.arc(0, 0, 20, 0.3, TAU - 0.6); ctx.lineWidth = 8; ctx.strokeStyle = P.white; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(12, -26); ctx.lineTo(28, -12); ctx.lineTo(8, -6); ctx.closePath(); ctx.fillStyle = P.white; ctx.fill();
      ctx.restore();
    }
  }
  function drawRescueCloud() {
    if (rescue <= 0) return;
    puff(lila.x - cam - 30, lila.y + lila.h - 10, 130, 1);
    face(lila.x - cam + 35, lila.y + lila.h + 2, 16);
  }
  function drawPlatHud() {
    setUI();
    rr(20, 16, 200, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
    starPath(56, 46, 20); ctx.fillStyle = P.yellow; ctx.fill(); outline(3);
    label(`${stars}/${totalStars}`, 140, 48, 30, P.white);
    if (hearts) {
      rr(234, 16, 120, 60, 30); ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill(); outline(4);
      heartPath(268, 48, 16); ctx.fillStyle = P.hot; ctx.fill(); outline(3);
      label(String(hearts), 316, 48, 30);
    }
  }
  function drawTitle() {
    setUI();
    const cx = W / scale / 2;
    const top = 40 + Math.max(0, (H / scale - 720) / 2 - (isTouch && portrait ? 120 : 0));
    label("Lila", cx, top + 70, 110, P.lilac, INK);
    label("la unicornia", cx, top + 160, 54, P.pink, INK);
    const fake = { vx: 3, face: 1, onGround: true, squash: 0, walk: frame * 0.08, blink: frame % 200 };
    drawLila(fake, cx - 10, top + 395 + Math.sin(frame * 0.08) * 10, 1.45);
    const by = top + 490, pulse = 1 + Math.sin(frame * 0.1) * 0.05;
    ctx.save(); ctx.translate(cx, by); ctx.scale(pulse, pulse);
    rr(-110, -42, 220, 84, 42); ctx.fillStyle = P.hot; ctx.fill(); outline(5);
    ctx.beginPath(); ctx.moveTo(-18, -24); ctx.lineTo(26, 0); ctx.lineTo(-18, 24); ctx.closePath(); ctx.fillStyle = P.white; ctx.fill(); outline(4);
    ctx.restore();
    if (portrait) label("gira el móvil ↻", cx, by + 90, 30, P.white);
  }

  function drawPlatScene() {
    setWorld();
    drawSky(cam);
    drawCastle();
    drawClouds();
    drawGround();
    drawSprings();
    drawItems();
    if (state === "plat" || state === "castle") {
      drawRescueCloud();
      if (lila.scale > 0) drawLila(lila, lila.x - cam + lila.w / 2 - 6, lila.y + lila.h + 1, lila.scale);
    }
    drawParticles((p) => !p.mx && !p.ui);
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    switch (state) {
      case "title": drawPlatScene(); drawTitle(); break;
      case "plat": case "castle": drawPlatScene(); drawPlatHud(); break;
      case "morph": drawMorph(); break;
      case "maze": case "mazeExit": drawMaze(); break;
      case "sea": drawSea(); break;
      case "end": drawEnd(); break;
    }
    // muestra la cruceta solo cuando sirve para algo
    const mode = state === "maze" ? "maze" : state === "sea" ? "sea" : state === "end" ? "end" : "plat";
    if (document.body.dataset.mode !== mode) {
      // al cambiar de pantalla se sueltan las teclas, que ningún botón se quede pulsado
      document.body.dataset.mode = mode;
      for (const k in keys) keys[k] = false;
      document.querySelectorAll(".touch button.on").forEach((b) => b.classList.remove("on"));
    }
  }

  /* ---------- Bucle ---------- */
  buildPlat();
  playSong("plat");
  let last = performance.now(), acc = 0;
  function loop(now) {
    acc += Math.min(now - last, 100);
    last = now;
    while (acc >= STEP) { update(); acc -= STEP; }
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // atajo de pruebas: ?pantalla=2 o ?pantalla=3 empieza directamente ahí
  const jump = new URLSearchParams(location.search).get("pantalla");
  if (jump === "2") startMaze();
  if (jump === "3") startSea();
  if (jump === "fin") startEnd();
})();
