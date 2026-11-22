/* Typographic Exploration — showcase
   Intro: a record rolls along the gallery wall, playing each cover,
   then everything settles into the grid. Click a cover to listen (Spotify). */
(() => {
  "use strict";

  const COVERS = window.COVERS || [];
  const N = COVERS.length;
  const $ = (s, el = document) => el.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const img = (c, size) => `covers/${c.slug}-${size}.webp`;
  const srcset = (c) => `${img(c, 640)} 640w, ${img(c, 1600)} 1600w`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const smooth = (t) => t * t * (3 - 2 * t);
  const spUrl = (c) => `https://open.spotify.com/track/${c.sp}`;
  const ytUrl = (c) => `https://www.youtube.com/watch?v=${c.yt}`;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PAGE = location.pathname + location.search;   // this page's own address, kept for the #cover links
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------------------------------------------------------
     Build the grid
     --------------------------------------------------------- */
  const grid = $("#grid");
  grid.innerHTML = COVERS.map((c, i) => `
    <button class="card" type="button" data-i="${i}"
      aria-label="${esc(`${pad(i + 1)}. ${c.song} by ${c.artist}. Album cover by ${c.student}. Play song.`)}">
      <span class="card__art"><img src="${img(c, 640)}" srcset="${srcset(c)}"
        sizes="(max-width: 760px) 46vw, (max-width: 1100px) 31vw, 23vw" alt="" decoding="async"></span>
      <span class="card__label">
        <span class="card__num" style="grid-row: 1 / span 3">${pad(i + 1)}</span>
        <span class="card__title">${esc(c.song)}</span>
        <span class="card__meta"><b>${esc(c.artist)}</b><span class="by"><span class="sep"> · </span>${esc(c.student)}</span></span>
        <span class="card__play"><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 0l9 5-9 5z"/></svg>Listen</span>
      </span>
    </button>`).join("");
  const cards = [...grid.querySelectorAll(".card")];
  const cardArts = cards.map((c) => $(".card__art", c));

  // Long song names (ATYCHIPHOBIA, HEAVENSWARD…) never break mid-word: if a word is wider than
  // its column, that title shrinks just enough for its longest word to fit.
  function fitCardTitles() {
    grid.querySelectorAll(".card__title").forEach((t) => {
      t.style.fontSize = "";
      const room = t.clientWidth;
      if (!room) return;
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap";
      t.appendChild(probe);
      const longest = Math.max(...t.textContent.replace(probe.textContent, "").split(/\s+/).map((w) => { probe.textContent = w; return probe.getBoundingClientRect().width; }));
      probe.remove();
      if (longest > room) t.style.fontSize = `${parseFloat(getComputedStyle(t).fontSize) * (room / longest) * 0.97}px`;
    });
  }
  fitCardTitles();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitCardTitles);
  let cardFitTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(cardFitTimer); cardFitTimer = setTimeout(fitCardTitles, 100); });

  // On phones the student name drops to its own line (no dangling separator)
  const mq = window.matchMedia("(max-width: 760px)");
  const syncSep = () => grid.querySelectorAll(".sep").forEach((s) => (s.hidden = mq.matches));
  mq.addEventListener ? mq.addEventListener("change", syncSep) : mq.addListener(syncSep);
  syncSep();

  /* ---------------------------------------------------------
     Timelines
     --------------------------------------------------------- */
  function buildTimeline(el, interactive) {
    el.innerHTML = `<span class="timeline__fill"></span>` + COVERS.map((c, i) =>
      interactive
        ? `<button class="timeline__tick" type="button" role="tab" data-i="${i}" aria-label="${esc(`${pad(i + 1)} ${c.song}`)}"></button>`
        : `<span class="timeline__tick"></span>`).join("");
    const ticks = [...el.querySelectorAll(".timeline__tick")];
    const fill = $(".timeline__fill", el);
    return (current, progress) => {
      ticks.forEach((t, i) => {
        t.classList.toggle("is-current", i === current);
        t.classList.toggle("is-past", i < current);
        if (interactive) t.setAttribute("aria-selected", i === current ? "true" : "false");
      });
      const p = progress == null ? (N > 1 ? current / (N - 1) : 0) : progress;
      fill.style.width = `${clamp(p, 0, 1) * 100}%`;
    };
  }

  /* ---------------------------------------------------------
     Sound-line shapes: one per song's character (data.js "wave")
     Each returns roughly -1…1 for u = 0…1 across one cover.
     --------------------------------------------------------- */
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const saw = (v) => 2 * (v - Math.floor(v + 0.5));
  const S = (f, u) => Math.sin(2 * Math.PI * f * u);
  const WAVES = {
    calm:    (u) => 0.55 * S(2, u),
    swell:   (u) => S(3, u) * (0.35 + 0.65 * Math.sin(Math.PI * u)),
    bouncy:  (u) => 1.1 * Math.abs(S(5, u)) - 0.2,
    groove:  (u) => 0.65 * S(4, u) + 0.3 * S(12, u),
    heavy:   (u) => 0.95 * S(1.5, u) + 0.18 * S(11, u),
    pulse:   (u) => 0.75 * Math.tanh(4 * S(6, u)),
    march:   (u) => 0.55 * Math.tanh(7 * S(4, u)) + 0.25 * S(16, u),
    sparkle: (u) => 0.45 * S(7, u) + 0.35 * S(19, u),
    jagged:  (u) => 0.85 * saw(9 * u) * (0.6 + 0.4 * hash(Math.floor(9 * u))),
    frantic: (u) => saw(17 * u) * (0.3 + 0.8 * hash(Math.floor(17 * u) + 7)),
    horror:  (u) => { const k = Math.floor(11 * u); const spike = hash(k + 3) > 0.72 ? 1.4 : 0.55; return saw(11 * u) * spike * (k % 2 ? 1 : -1); }
  };

  /* ---------------------------------------------------------
     SOUND — made live in the browser with Web Audio (no files).
     Browsers only allow sound after a click, so it starts from
     the Enter button (or Replay intro).
     --------------------------------------------------------- */
  const Sound = (() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    let ctx = null, master = null, loops = [], humGain = null, bedOscs = [];
    const BED = [1, 1.5, 2];             // root, fifth, octave: a soft open chord
    const BED_MIX = [0.5, 0.28, 0.16];
    let on = store.get("sound") !== "off";
    // A minor pentatonic: each cover gets its own root note
    const SCALE = [220, 261.63, 293.66, 329.63, 392];

    function unlock() {
      if (!AC) return;
      try {
        if (!ctx) {
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = on ? 0.9 : 0;
          const comp = ctx.createDynamicsCompressor();
          master.connect(comp); comp.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { ctx = null; }
    }
    const ready = () => ctx && ctx.state !== "closed";
    const now = () => ctx.currentTime;

    function setOn(v) {
      on = v;
      store.set("sound", v ? "on" : "off");
      if (ready()) master.gain.setTargetAtTime(v ? 0.9 : 0, now(), 0.05);
    }


    // one note: oscillator → envelope (→ filter) → master
    function tone(freq, { type = "sine", at = 0, dur = 0.4, vol = 0.1, attack = 0.01, filter = null, glideTo = null, vibrato = 0 } = {}) {
      const t = now() + at;
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (filter) { const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filter; node.connect(f); node = f; }
      if (vibrato) { const l = ctx.createOscillator(); const lg = ctx.createGain(); l.frequency.value = 6; lg.gain.value = vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
      node.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    }

    // a clean, quiet chord under the intro: it fades in slowly from silence,
    // glides to each song's note as the record reaches its cover, and fades out at the end
    function start() {
      if (!ready()) return;
      stop(0.01);
      const bed = ctx.createGain();
      const t = now();
      bed.gain.setValueAtTime(0, t);
      bed.gain.linearRampToValueAtTime(0.012, t + 3);       // about 3 seconds to full level; kept quiet, it's only a backdrop
      bed.connect(master);
      bedOscs = BED.map((m, k) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = 220 * m;
        const g = ctx.createGain(); g.gain.value = BED_MIX[k];
        o.connect(g); g.connect(bed); o.start();
        loops.push({ s: o, g });
        return o;
      });
      loops.push({ s: null, g: bed });
      humGain = bed;
    }
    // move the chord to a new root note, gliding rather than jumping
    function bedTo(root) {
      if (!ready()) return;
      bedOscs.forEach((o, k) => o.frequency.setTargetAtTime(root * BED[k], now(), 0.18));
    }
    function speed() { /* the chord no longer follows speed: it was what made it jump in */ }
    function stop(fade = 0.6) {
      if (!ctx) return;
      loops.forEach(({ s, g }) => {
        g.gain.cancelScheduledValues(now());
        g.gain.setValueAtTime(g.gain.value, now());
        g.gain.setTargetAtTime(0.0001, now(), fade / 3);
        if (s) { try { s.stop(now() + fade + 0.1); } catch (e) { /* already stopped */ } }
      });
      loops = []; humGain = null; bedOscs = [];
    }

    // the jump through a gap: a soft kick, in time with the spike in the line
    function hop() {
      if (!ready()) return;
      tone(160, { glideTo: 55, dur: 0.18, vol: 0.32 });
    }

    // a short phrase in each song's character as the record reaches its cover
    function cover(i) {
      if (!ready()) return;
      const r = SCALE[i % SCALE.length];
      bedTo(r);                             // the background chord moves to this song's note
      const kind = (COVERS[i] && COVERS[i].wave) || "calm";
      const P = {
        calm:    () => { tone(r, { attack: 0.25, dur: 1.4, vol: 0.1 }); tone(r * 1.5, { attack: 0.3, dur: 1.4, vol: 0.06 }); },
        swell:   () => [1, 1.2, 1.5].forEach((m) => tone(r * m, { type: "triangle", attack: 0.5, dur: 1.5, vol: 0.06 })),
        bouncy:  () => { tone(r * 2, { type: "triangle", dur: 0.25, vol: 0.16 }); tone(r * 3, { type: "triangle", at: 0.12, dur: 0.25, vol: 0.14 }); },
        groove:  () => { tone(r / 2, { dur: 0.4, vol: 0.2 }); tone(r * 2, { type: "triangle", dur: 0.2, vol: 0.12 }); tone(r * 2.5, { type: "triangle", at: 0.18, dur: 0.2, vol: 0.12 }); },
        heavy:   () => { tone(r / 2, { type: "sawtooth", attack: 0.05, dur: 1.2, vol: 0.12, filter: 420 }); tone(r / 2 * 1.01, { type: "sawtooth", attack: 0.05, dur: 1.2, vol: 0.1, filter: 420 }); },
        pulse:   () => [0, 0.1, 0.2].forEach((at) => tone(r * 2, { type: "square", at, dur: 0.07, vol: 0.06, filter: 2200 })),
        march:   () => { tone(r, { type: "square", dur: 0.08, vol: 0.05, filter: 1500 }); tone(r, { type: "square", at: 0.15, dur: 0.08, vol: 0.05, filter: 1500 }); tone(r / 2, { dur: 0.35, vol: 0.16 }); },
        sparkle: () => [[4, 0], [6, 0.07], [8, 0.14]].forEach(([m, at]) => tone(r * m / 2, { at, dur: 0.6, vol: 0.06 })),
        jagged:  () => tone(r, { type: "sawtooth", dur: 0.35, vol: 0.12, filter: 1600 }),
        frantic: () => { for (let k = 0; k < 6; k++) tone(SCALE[(i + k * 3) % 5] * 2, { type: "square", at: k * 0.045, dur: 0.04, vol: 0.05, filter: 3000 }); },
        horror:  () => { tone(r, { attack: 0.1, dur: 1.3, vol: 0.1, vibrato: 9 }); tone(r * Math.SQRT2, { attack: 0.1, dur: 1.3, vol: 0.08, vibrato: 7 }); }
      };
      (P[kind] || P.calm)();
    }

    // the record slows down: the background chord sinks a little and fades (no falling 'bwoop' tone)
    function spinDown() {
      if (!ready()) return;
      bedOscs.forEach((o) => o.frequency.setTargetAtTime(o.frequency.value * 0.75, now(), 0.6)); // the chord sinks with it
      stop(1.6);
    }
    // as it lands in the teal dot: a soft low thump (a record settling on a felt mat),
    // then a warm, low closing chord — no bright "ding"
    function land() {
      if (!ready()) return;
      tone(196, { glideTo: 147, dur: 0.22, vol: 0.28, filter: 900 });
      [220, 261.63, 329.63, 440].forEach((f, k) =>
        tone(f, { type: "triangle", at: 0.1, attack: 0.3, dur: 2, vol: [0.09, 0.06, 0.06, 0.035][k], filter: 1800 }));
    }

    // the grille breathing: a very soft swell, only possible once sound is allowed (e.g. after Replay)
    function breath() {
      if (!ready() || ctx.state !== "running") return;
      tone(196, { attack: 0.7, dur: 2.2, vol: 0.03, filter: 800 });
      tone(293.66, { attack: 0.8, dur: 2.2, vol: 0.018, filter: 800 });
    }

    return { unlock, start, speed, stop, hop, cover, spinDown, land, breath, setOn, isOn: () => on };
  })();

  /* ---------------------------------------------------------
     INTRO — a record rolls along the gallery wall
     --------------------------------------------------------- */
  const intro = $("#intro");
  const wall = $("#wall");
  const track = $("#wallTrack");
  const introCount = $("#introCount");
  const setIntroTimeline = buildTimeline($("#introTimeline"), false);
  const roller = $("#roller");
  const rollerDisc = $("#rollerDisc");
  const rollerLabel = $("#rollerLabel");
  const trail = $("#trail");
  const trailLine = $("#trailLine");
  const trailGlow = $("#trailGlow");
  const trailReveal = $("#trailReveal");
  const spotlight = $("#spotlight");

  track.innerHTML = COVERS.map((c, i) => `
    <div class="wall__item">
      <div class="wall__art"><img src="${img(c, 1600)}" alt="" decoding="async"><span class="wall__shade"></span></div>
      <div class="wall__label">
        <span class="wall__num" style="grid-row: 1 / span 2">${pad(i + 1)}</span>
        <span class="wall__title">${esc(c.song)}</span>
        <span class="wall__meta">${esc(c.artist)} · ${esc(c.student)}</span>
      </div>
    </div>`).join("");
  const wallItems = [...track.querySelectorAll(".wall__item")];
  const wallArts = wallItems.map((w) => $(".wall__art", w));
  const wallLabels = wallItems.map((w) => $(".wall__label", w));
  const shades = wallItems.map((w) => $(".wall__shade", w));
  const shadeVals = new Array(N).fill(-1);

  // preload the small images used on the record label
  COVERS.forEach((c) => { const im = new Image(); im.src = img(c, 640); });

  let introTimers = [];
  let rafId = 0;
  let introRunning = false;
  let wallStarted = false;
  let W = {};
  let R = { sx: 0, y: 0, cur: null };

  function layoutWall() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const size = Math.round(Math.min(vh * 0.46, vw * 0.66, 600));
    const gap = Math.round(Math.max(size * 0.3, 44));
    const step = size + gap;
    const D = Math.round(size * 0.42);           // record diameter
    const r = D / 2;
    const floor = size + Math.round(D * 0.8);    // the line the record rolls on (its top tucks behind the covers)
    const amp = Math.max(6, Math.round(D * 0.14));
    // curved gallery: every cover stands on a big turning drum; the one at the front faces you
    const drum = step * 1.8;                         // drum radius: smaller = stronger curve
    wallItems.forEach((it) => { it.style.width = `${size}px`; it.style.left = `${Math.round(vw / 2 - size / 2)}px`; });
    track.style.height = `${floor + amp + 18 + 72}px`;
    track.style.perspective = `${Math.round(drum * 1.05)}px`;
    track.style.perspectiveOrigin = `50% ${Math.round(size / 2)}px`;
    wallArts.forEach((a) => { a.style.width = a.style.height = `${size}px`; });
    wallLabels.forEach((l) => { l.style.marginTop = `${floor - size + amp + 18}px`; });
    roller.style.width = roller.style.height = `${D}px`;

    W = {
      vw, size, gap, step, D, r, floor, amp, drum,
      start: vw + 10,                                   // first cover just off the right edge
      end: vw / 2 - ((N - 1) * step + size / 2),        // last cover centred
      hop: D * 0.85,
      peak: D * 0.72,                                   // how high the line spikes when the record jumps
      rollIn: 1600,
      exitTo: Math.min(vw / 2 + size / 2 + gap + r, vw - r - 12),
    };
    W.dur = ((W.start - W.end) / step) * 1000;          // ~1 s per cover
    W.xr0 = -D - W.start;                               // record start, in wall coordinates
    buildTrail();
  }

  function buildTrail() {
    const { step, size, gap, floor, amp, xr0, vw } = W;
    const from = Math.floor(xr0), to = Math.ceil(N * step + vw);
    let d = `M${from} ${floor}`;
    for (let x = from; x <= to; x += 3) {
      const s = x + gap / 2;                            // each song's stretch runs gap-centre to gap-centre
      const k = Math.floor(s / step);
      let y = floor;
      if (k >= 0 && k < N) {
        const u = (s - k * step) / step;
        const env = Math.pow(Math.sin(Math.PI * u), 0.7);
        const f = WAVES[COVERS[k].wave] || WAVES.calm;
        y = floor - amp * env * f(u);
      }
      // where the record jumps through a gap, the line jumps too: a level-meter peak
      const g = Math.round((x - (size + gap / 2)) / step);
      if (g >= 0 && g <= N - 2) {
        const dx = x - (g * step + size + gap / 2);
        const fade = Math.exp(-Math.pow(dx / (0.085 * step), 2));
        const wob = Math.cos((2 * Math.PI * dx) / (0.075 * step));
        y -= W.peak * fade * (wob > 0 ? wob : 0.18 * wob);
      }
      d += `L${x} ${y.toFixed(1)}`;
    }
    trailLine.setAttribute("d", d);
    trailGlow.setAttribute("d", d);
  }

  // linear glide with soft start and soft landing
  const glide = (p) => p - (Math.sin(2 * Math.PI * p) / (2 * Math.PI)) * 0.55;

  // i = -1 is the blank teal record (before the first cover and as it lands)
  function setRecordCover(i) {
    if (i === R.cur) return;
    R.cur = i;
    rollerDisc.classList.toggle("is-blank", i < 0);
    if (i < 0) {
      rollerLabel.style.backgroundImage = "none";
      roller.style.setProperty("--tint", "#00abab");
      return;
    }
    const c = COVERS[i];
    rollerLabel.style.backgroundImage = `url("${img(c, 640)}")`;
    roller.style.setProperty("--tint", c.tint || "#006767");
    rollerDisc.classList.remove("is-flip"); void rollerDisc.offsetWidth; rollerDisc.classList.add("is-flip");
    introCount.textContent = `${pad(i + 1)} / ${pad(N)}`;
    Sound.cover(i);
  }

  // Place everything for a given track offset (x) and record screen position (sx)
  // bend = 1: full curve; 0: the gallery has straightened into a flat line
  function drawFrame(x, sx, lightAt, bend = 1) {
    const { step, size, gap, r, floor, hop, drum } = W;
    if (intro.scrollTop) intro.scrollTop = 0;
    trail.style.transform = `translate3d(${x}px,0,0)`;

    // turn the drum: the arc position at the centre of the screen is vw/2 - x
    const c = W.vw / 2 - x;
    for (let k = 0; k < N; k++) {
      const arc = k * step + size / 2 - c;              // distance along the gallery from the front
      const it = wallItems[k];
      if (bend < 0.003) {                               // flat: a straight wall
        if (it.style.visibility) it.style.visibility = "";
        it.style.transform = `translate3d(${arc.toFixed(1)}px,0,0)`;
        continue;
      }
      const rad = drum / bend;                          // a bigger radius = a gentler curve
      const th = arc / rad;                             // this cover's angle from the front, in radians
      if (Math.abs(th) > 1.45) { if (it.style.visibility !== "hidden") it.style.visibility = "hidden"; continue; }
      if (it.style.visibility) it.style.visibility = "";
      it.style.transform = `translateZ(${-rad.toFixed(1)}px) rotateY(${th.toFixed(5)}rad) translateZ(${rad.toFixed(1)}px)`;
    }

    const xr = sx - x;                                   // record centre in wall coordinates
    const g = Math.round((xr - (size + gap / 2)) / step);   // nearest gap between two covers
    const dist = Math.abs(xr - (g * step + size + gap / 2));
    const lift = g >= 0 && g <= N - 2 ? hop * Math.exp(-Math.pow(dist / (0.16 * step), 2)) : 0; // hop up through the gap
    const y = floor - 2 * r - lift;
    const deg = ((xr - W.xr0) / r) * (180 / Math.PI);
    roller.style.transform = `translate3d(${sx - r}px,${y}px,0)`;
    rollerDisc.style.transform = `rotate(${deg % 360}deg)`;
    R.sx = sx; R.y = y;

    // sound: a kick at the top of each jump, and a rumble that follows the record's speed
    if (g >= 0 && g <= N - 2 && dist < 0.05 * step && g !== R.lastHop) { R.lastHop = g; Sound.hop(); }
    const tNow = performance.now();
    if (R.lastXr != null && tNow > R.lastT) Sound.speed(Math.abs(xr - R.lastXr) / (tNow - R.lastT) / (step / 1000));
    R.lastXr = xr; R.lastT = tNow;

    trailReveal.setAttribute("width", Math.max(0, xr - r * 0.25 + 99999));
    spotlight.style.transform = `translate3d(${sx}px,0,0)`;

    const lx = lightAt == null ? xr : lightAt;
    const cur = clamp(Math.round((lx - size / 2) / step), 0, N - 1);
    // stays blank until it reaches the first cover's stretch of the sound line
    setRecordCover(lx < -gap / 2 ? -1 : cur);
    for (let k = 0; k < N; k++) {                        // gallery lighting: dim room, lit where the record is
      const d = Math.abs(lx - (k * step + size / 2));
      const l = smooth(clamp(1 - d / (step * 0.8), 0, 1));
      const o = Math.round((0.68 * (1 - l)) * 100) / 100;
      if (o !== shadeVals[k]) { shades[k].style.opacity = o; shadeVals[k] = o; }
    }
    return cur;
  }

  function runWall() {
    wallStarted = true;
    layoutWall();
    roller.classList.add("is-on");
    Sound.start();
    const t0 = performance.now();
    let exitT = 0;
    let spunDown = false;
    const frame = (now) => {
      const t = now - t0;
      const p = Math.min(1, t / W.dur);
      const x = W.start + (W.end - W.start) * glide(p);
      if (p < 1) {
        const sx = -W.D + (W.vw / 2 + W.D) * easeOut(t / W.rollIn);
        const cur = drawFrame(x, sx);
        setIntroTimeline(cur, glide(p));
        rafId = requestAnimationFrame(frame);
        return;
      }
      // the gallery has stopped: the record eases out from under the last cover and slows to a stop,
      // while the curve straightens so the covers can fly to the grid from exactly where they are
      if (!exitT) exitT = now;
      const e = (now - exitT) / 1700;
      if (e > 0.35 && !spunDown) { spunDown = true; Sound.spinDown(); }
      const sx = W.vw / 2 + (W.exitTo - W.vw / 2) * easeInOut(e);
      drawFrame(x, sx, W.end * -1 + W.vw / 2, 1 - easeInOut(e));
      setIntroTimeline(N - 1, 1);
      if (e < 1) rafId = requestAnimationFrame(frame);
      else introTimers.push(setTimeout(settle, 250));
    };
    rafId = requestAnimationFrame(frame);
  }

  function resetRoller() {
    roller.classList.remove("is-on", "is-landing", "is-gone");
    roller.style.transition = "";
    roller.style.transform = "";
    trailReveal.setAttribute("width", 0);
    shades.forEach((s, k) => { s.style.opacity = ""; shadeVals[k] = -1; });
    R.cur = null; R.lastHop = null; R.lastXr = null;
  }

  // clicked = started by a click (Replay intro), so sound is already allowed and no Enter button is needed
  function playIntro(clicked = false) {
    introRunning = true;
    wallStarted = false;
    window.scrollTo(0, 0);
    document.body.classList.add("intro-on", "no-scroll");
    intro.classList.remove("t1", "t2", "t3", "t-gate", "is-leaving");
    if (grille) grille.classList.remove("is-leaving");
    wall.style.visibility = "";
    resetRoller();
    wallItems.forEach((it) => { it.style.visibility = "hidden"; });
    grid.classList.add("is-settling");
    const at = (ms, fn) => introTimers.push(setTimeout(fn, ms));
    at(150, () => intro.classList.add("t1"));
    at(1100, () => intro.classList.add("t2"));
    if (clicked) at(3500, startWall);
    else at(2300, () => { intro.classList.add("t-gate"); startBreathing(); });   // Enter or Space on the keyboard also starts it
  }

  // a soft breath in time with each ring of light in the grille (CSS: 0.8 s delay, every 3.6 s)
  let breathTimers = [];
  function startBreathing() {
    stopBreathing();
    breathTimers.push(setTimeout(function beat() {
      Sound.breath();
      breathTimers.push(setTimeout(beat, 3600));
    }, 800));
  }
  function stopBreathing() { breathTimers.forEach(clearTimeout); breathTimers = []; }

  function startWall() {
    if (!introRunning || wallStarted) return;
    stopBreathing();
    intro.classList.add("t3");          // the title (with Enter and the pile) fades out on its own
    runWall();
  }

  function clearIntroTimers() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
    cancelAnimationFrame(rafId);
  }

  // The record drops into the pulsing dot next to "Click a cover to listen"
  function landRecord() {
    const dot = $(".hint-dot");
    if (!dot || !roller.classList.contains("is-on")) { roller.classList.add("is-gone"); return; }
    const to = dot.getBoundingClientRect();
    const from = roller.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = Math.max(to.width, 8) / from.width;
    setRecordCover(-1);                                  // back to plain teal before it lands in the teal dot
    roller.classList.add("is-landing");
    roller.style.transition = "transform 1.15s cubic-bezier(.65,0,.35,1), opacity .35s ease 1s";
    roller.style.transform = `translate3d(${R.sx - W.r + dx}px,${R.y + dy}px,0) scale(${s})`;
    setTimeout(() => roller.classList.add("is-gone"), 30);
  }

  // FLIP: every grid cover starts where its twin sits on the wall, then flies home.
  function settle() {
    if (!introRunning) return;
    introRunning = false;
    clearIntroTimers();
    stopBreathing();
    store.set("introSeen", "1");
    window.scrollTo(0, 0);

    const canFly = wallStarted && !reduceMotion;
    if (canFly) {
      grid.classList.add("is-flying");
      const from = wallArts.map((a) => a.getBoundingClientRect());
      cardArts.forEach((art, i) => {
        const to = art.getBoundingClientRect();
        const f = from[i];
        const s = f.width / to.width;
        art.style.transition = "none";
        art.style.transformOrigin = "0 0";
        art.style.transform = `translate(${f.left - to.left}px, ${f.top - to.top}px) scale(${s})`;
        art.style.zIndex = "101";
        art.style.position = "relative";
      });
      track.style.visibility = "hidden";
      trail.style.opacity = "0";
      void grid.offsetWidth; // commit start positions
      requestAnimationFrame(() => {
        cardArts.forEach((art, i) => {
          art.style.transition = `transform 1.25s cubic-bezier(.16,1,.3,1) ${i * 45}ms`;
          art.style.transform = "";
        });
        landRecord();
        setTimeout(Sound.land, 1050);
      });
    } else {
      wall.style.visibility = "hidden";
    }
    Sound.stop(0.5);

    intro.classList.add("is-leaving");
    const total = canFly ? 1250 + N * 45 : 900;
    setTimeout(() => {
      document.body.classList.remove("intro-on", "no-scroll");
      intro.classList.remove("is-leaving");
      grid.classList.remove("is-flying", "is-settling");
      track.style.visibility = "";
      trail.style.opacity = "";
      cardArts.forEach((art) => {
        art.style.transition = art.style.transformOrigin = art.style.zIndex = art.style.position = "";
      });
    }, Math.max(total, 1250));
    // labels fade in as the covers land
    setTimeout(() => grid.classList.remove("is-settling"), canFly ? 900 : 300);
  }

  // the speaker grille under the title: it breathes while waiting, and beats once on Enter
  const grille = $("#grille");
  const stack = grille;

  $("#enterIntro").addEventListener("click", () => {
    Sound.unlock();
    Sound.hop();                       // the grille's beat, heard
    if (stack) stack.classList.add("is-leaving");
    startWall();
  });
  const soundBtn = $("#soundToggle");
  const syncSoundBtn = () => {
    soundBtn.setAttribute("aria-label", Sound.isOn() ? "Sound on" : "Sound off");
    soundBtn.setAttribute("aria-pressed", Sound.isOn() ? "true" : "false");
  };
  soundBtn.addEventListener("click", () => { Sound.unlock(); Sound.setOn(!Sound.isOn()); syncSoundBtn(); });
  syncSoundBtn();
  document.addEventListener("keydown", (e) => {
    if (!introRunning) return;
    if (e.target && e.target.closest && e.target.closest("button")) return; // let buttons handle their own keys
    if (!wallStarted && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); Sound.unlock(); if (grille) grille.classList.add("is-leaving"); startWall(); }
    else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); settle(); }
  });
  // Replay intro goes back to the title screen (Enter + the breathing grille), like the first visit
  $("#replayIntro").addEventListener("click", () => { if (!introRunning) { Sound.unlock(); playIntro(false); } });
  window.addEventListener("resize", () => { if (introRunning && wallStarted) layoutWall(); });

  /* ---------------------------------------------------------
     LISTENING VIEW + Spotify
     --------------------------------------------------------- */
  const listen = $("#listen");
  const listenCover = $("#listenCover");
  const vinyl = $("#vinyl");
  const vinylLabel = $("#vinylLabel");
  const fallback = $("#spFallback");
  const spLink = $("#spLink");
  const ytLink = $("#ytLink");
  const setListenTimeline = buildTimeline($("#listenTimeline"), true);
  let current = -1;
  let lastFocus = null;

  // Spotify iFrame API: one controller, reused for every song
  let ctl = null;            // EmbedController once created
  let booting = false;
  let wantPlay = false;      // play as soon as the loaded song is ready
  let pendingUri = null;
  let apiPromise = null;
  let pb = { playing: false, pos: 0, dur: 0, ignoreUntil: 0, endedFor: -1 };

  let watchdog = 0;
  function armWatchdog() {     // if Spotify can't load (blocked network, preview host), offer the links
    clearTimeout(watchdog);
    watchdog = setTimeout(() => { if (!ctl) fallback.hidden = false; }, 7000);
  }
  function loadSpotify() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      const prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => { prev && prev(api); resolve(api); };
      const s = document.createElement("script");
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      s.onerror = () => { fallback.hidden = false; };
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  function onPlayback(e) {
    const d = (e && e.data) || {};
    const playing = !d.isPaused && !d.isBuffering;
    if (playing) hideTap();
    vinyl.classList.toggle("is-spinning", playing);
    if (playing) fallback.hidden = true;
    if (performance.now() < pb.ignoreUntil) { pb.pos = d.position || 0; return; }
    const dur = d.duration || 0, pos = d.position || 0;
    // the preview (or song) finished: move on to the next cover
    const atEnd = dur > 0 && (pos >= dur - 400 || (d.isPaused && pb.playing && pb.pos >= dur - 1600));
    if (atEnd && pb.endedFor !== current && !listen.hidden) {
      pb.endedFor = current;
      go(current + 1, true);
    }
    pb.playing = !d.isPaused; pb.pos = pos; pb.dur = dur;
  }

  function loadSong(i, autoplay) {
    const c = COVERS[i];
    const uri = `spotify:track:${c.sp}`;
    wantPlay = autoplay;
    pb.ignoreUntil = performance.now() + 1500;
    pb.playing = false; pb.pos = 0; pb.endedFor = -1;
    armWatchdog();
    if (ctl) {
      ctl.loadUri(uri);
      if (autoplay) setTimeout(() => { if (wantPlay && ctl) ctl.play(); }, 900); // in case "ready" doesn't fire again
      return;
    }
    pendingUri = uri;
    if (booting) return;
    booting = true;
    loadSpotify().then((api) => {
      api.createController($("#spPlayer"), { uri: pendingUri, width: "100%", height: 152 }, (controller) => {
        ctl = controller;
        fallback.hidden = true;
        controller.addListener("ready", () => {
          if (wantPlay) { wantPlay = false; controller.play(); }
        });
        controller.addListener("playback_update", onPlayback);
      });
    });
  }

  function stopSong() {
    wantPlay = false;
    if (ctl && ctl.pause) ctl.pause();
    vinyl.classList.remove("is-spinning");
  }

  function fill(i) {
    const c = COVERS[i];
    listenCover.src = img(c, 1600);
    listenCover.alt = `Album cover for ${c.song} by ${c.artist}, designed by ${c.student}`;
    vinylLabel.style.backgroundImage = `url("${img(c, 640)}")`;
    $("#listenNum").textContent = pad(i + 1);
    $("#listenTitle").textContent = c.song;
    $("#listenArtist").textContent = c.artist;
    $("#listenStudent").textContent = c.student;
    $("#listenNow").textContent = `${pad(i + 1)} · ${c.song}`;
    spLink.href = spUrl(c);
    ytLink.href = ytUrl(c);
    listen.style.setProperty("--tint", c.tint || "#006767");
    $("#listenGlow").style.setProperty("--tint", c.tint || "#006767");
    setListenTimeline(i);
    cards.forEach((card, k) => card.classList.toggle("is-current", k === i));
    // full address (the preview's <base> would otherwise turn "#slug" into the main site's address)
    try { history.replaceState(null, "", `${PAGE}#${c.slug}`); } catch (e) { /* file:// etc. */ }
  }

  /* Opening a song's own link (…#espresso): try to play straight away. Browsers often block
     sound before the visitor has clicked anything; then the first click anywhere starts it. */
  const tapHint = $("#tapToPlay");
  let tapArmed = false;
  function hideTap() {
    tapHint.hidden = true;
    if (tapArmed) { tapArmed = false; document.removeEventListener("pointerdown", onFirstTap, true); document.removeEventListener("keydown", onFirstTap, true); }
  }
  function onFirstTap(e) {
    if (e.target && e.target.closest && e.target.closest("#listenClose")) { hideTap(); return; } // closing: don't start music
    hideTap();
    if (ctl && !listen.hidden) ctl.play(); else wantPlay = true;
  }
  function armTapToPlay() {
    setTimeout(() => {
      if (listen.hidden || pb.playing) return;          // it's already playing (or closed): nothing to do
      tapHint.hidden = false;
      if (!tapArmed) {
        tapArmed = true;
        document.addEventListener("pointerdown", onFirstTap, true);
        document.addEventListener("keydown", onFirstTap, true);
      }
    }, 2500);
  }

  function open(i, autoplay = true) {
    current = (i + N) % N;
    lastFocus = document.activeElement;
    fill(current);
    listen.hidden = false;
    document.body.classList.add("no-scroll");
    vinyl.classList.remove("is-out", "is-spinning");
    requestAnimationFrame(() => {
      listen.classList.add("is-open");
      setTimeout(() => vinyl.classList.add("is-out"), reduceMotion ? 0 : 450);
    });
    $("#listenClose").focus({ preventScroll: true });
    // Deep links load the song without playing (browsers block sound before a click)
    loadSong(current, autoplay);
  }

  let swapTimer = 0;
  function go(i, autoplay = true) {
    const next = (i + N) % N;
    if (next === current) return;
    current = next;
    clearTimeout(swapTimer);
    listen.classList.add("is-swapping");
    vinyl.classList.remove("is-out", "is-spinning");    // the record slides back into its sleeve
    // get the next cover ready while that happens, then swap it in behind the closed sleeve
    const pre = new Image(); pre.src = img(COVERS[current], 1600);
    const target = current;
    swapTimer = setTimeout(() => {
      let swapped = false;
      const swap = () => {
        if (swapped || target !== current) return;
        swapped = true;
        fill(current);
        listen.classList.remove("is-swapping");
        setTimeout(() => vinyl.classList.add("is-out"), reduceMotion ? 0 : 200); // the new record slides out
      };
      if (pre.complete || reduceMotion) swap();
      else { pre.onload = pre.onerror = swap; setTimeout(swap, 600); }
    }, reduceMotion ? 0 : 560);
    loadSong(current, autoplay);
  }

  function close() {
    if (listen.hidden) return;
    hideTap();
    stopSong();
    vinyl.classList.remove("is-out");
    listen.classList.remove("is-open");
    cards.forEach((card) => card.classList.remove("is-current"));
    try { history.replaceState(null, "", PAGE); } catch (e) { /* noop */ }
    setTimeout(() => {
      listen.hidden = true;
      document.body.classList.remove("no-scroll");
      const back = cards[current] || lastFocus;
      back && back.focus({ preventScroll: false });
    }, reduceMotion ? 0 : 400);
  }

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (card) open(+card.dataset.i);
  });
  $("#listenClose").addEventListener("click", close);
  $("#prevBtn").addEventListener("click", () => go(current - 1));
  $("#nextBtn").addEventListener("click", () => go(current + 1));
  $("#listenTimeline").addEventListener("click", (e) => {
    const t = e.target.closest(".timeline__tick");
    if (t) go(+t.dataset.i);
  });
  document.addEventListener("keydown", (e) => {
    if (listen.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
    else if (e.key === "Tab") { // keep focus inside the dialog
      const f = [...listen.querySelectorAll("button, a[href], iframe")].filter((el) => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------------------------------------------------
     Title: TYPOGRAPHIC and EXPLORATION (11 letters each) set to the same width,
     by opening up the letter spacing of the narrower word a touch
     --------------------------------------------------------- */
  function fitTitle() {
    const lines = [...document.querySelectorAll(".hero__line")];
    if (lines.length < 2) return;
    const h1 = lines[0].parentElement;
    h1.style.fontSize = "";
    lines.forEach((l) => { l.style.letterSpacing = ""; l.style.marginRight = ""; });
    // never wider than the space it has (narrow phones, or a wider fallback font)
    const room = h1.parentElement.clientWidth || h1.clientWidth;
    const natural = Math.max(...lines.map((l) => l.getBoundingClientRect().width));
    if (room && natural > room) {
      h1.style.fontSize = `${parseFloat(getComputedStyle(h1).fontSize) * (room / natural) * 0.98}px`;
    }
    const w = lines.map((l) => l.getBoundingClientRect().width);
    const widest = Math.max(...w);
    lines.forEach((l, i) => {
      const extra = widest - w[i];
      if (extra < 0.5) return;
      const n = l.textContent.trim().length;
      const add = extra / (n - 1);                       // spread across the gaps between letters
      const base = parseFloat(getComputedStyle(l).letterSpacing) || 0;
      l.style.letterSpacing = `${base + add}px`;
      l.style.marginRight = `${-(base + add)}px`;        // no extra space after the last letter
    });
  }
  fitTitle();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);

  /* Title screen: the DGMD logo is never wider than TYPOGRAPHIC EXPLORATION.
     Where the title wraps to two lines (phones), the logo matches its width exactly. */
  function fitIntroMark() {
    const mark = $(".intro__mark"), head = $(".intro__headline");
    if (!mark || !head) return;
    // measure the title as it looks once settled (its letter-spacing animates in)
    const probe = document.createElement("span");
    const cs = getComputedStyle(head);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};text-transform:uppercase;letter-spacing:-0.01em`;
    document.body.appendChild(probe);
    const width = (t) => { probe.textContent = t; return probe.getBoundingClientRect().width; };
    const room = head.parentElement.clientWidth - 48;          // the title area minus its padding
    const full = width("Typographic Exploration");
    const titleWidth = full <= room ? full : Math.max(width("Typographic"), width("Exploration"));
    probe.remove();
    mark.style.width = `${Math.round(Math.min(420, titleWidth))}px`;
  }
  fitIntroMark();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitIntroMark);
  window.addEventListener("resize", fitIntroMark);
  let fitTimer = 0;
  window.addEventListener("resize", () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitTitle, 80); });

  /* ---------------------------------------------------------
     Start
     --------------------------------------------------------- */
  document.body.classList.remove("is-loading");
  const deep = COVERS.findIndex((c) => `#${c.slug}` === location.hash);
  if (deep >= 0) {
    open(deep, true);        // try to play right away
    armTapToPlay();          // if the browser blocked it, the first click anywhere plays
  } else if (!reduceMotion && store.get("introSeen") !== "1") {
    playIntro();
  }
})();
