/* Typographic Exploration — showcase
   Intro (gallery wall) → settles into grid → click a cover to listen (YouTube). */
(() => {
  "use strict";

  const COVERS = window.COVERS || [];
  const N = COVERS.length;
  const $ = (s, el = document) => el.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const img = (c, size) => `covers/${c.slug}-${size}.webp`;
  const srcset = (c) => `${img(c, 640)} 640w, ${img(c, 1600)} 1600w`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      fill.style.width = `${Math.max(0, Math.min(1, p)) * 100}%`;
    };
  }

  /* ---------------------------------------------------------
     INTRO — gallery wall that settles into the grid
     --------------------------------------------------------- */
  const intro = $("#intro");
  const wall = $("#wall");
  const track = $("#wallTrack");
  const introCount = $("#introCount");
  const setIntroTimeline = buildTimeline($("#introTimeline"), false);

  track.innerHTML = COVERS.map((c, i) => `
    <div class="wall__item">
      <div class="wall__art"><img src="${img(c, 1600)}" alt="" decoding="async"></div>
      <div class="wall__label">
        <span class="wall__num" style="grid-row: 1 / span 2">${pad(i + 1)}</span>
        <span class="wall__title">${esc(c.song)}</span>
        <span class="wall__meta">${esc(c.artist)} · ${esc(c.student)}</span>
      </div>
    </div>`).join("");
  const wallItems = [...track.querySelectorAll(".wall__item")];
  const wallArts = wallItems.map((w) => $(".wall__art", w));

  let introTimers = [];
  let rafId = 0;
  let introRunning = false;
  let wallStarted = false;
  let W = { size: 0, gap: 0, start: 0, end: 0, dur: 0 };

  function layoutWall() {
    const vw = window.innerWidth, vh = window.innerHeight;
    const size = Math.round(Math.min(vh * 0.5, vw * 0.66, 620));
    const gap = Math.round(Math.max(size * 0.3, 44));
    wallItems.forEach((it) => { it.style.width = `${size}px`; it.style.marginRight = `${gap}px`; });
    wallArts.forEach((a) => { a.style.width = a.style.height = `${size}px`; });
    const step = size + gap;
    W = {
      size, gap, step,
      start: vw + 10,                                   // first cover just off the right edge
      end: vw / 2 - ((N - 1) * step + size / 2),        // last cover centred
    };
    W.dur = ((W.start - W.end) / step) * 1000;          // ~1 s per cover
  }

  // linear glide with soft start and soft landing
  const glide = (p) => p - (Math.sin(2 * Math.PI * p) / (2 * Math.PI)) * 0.55;

  function runWall() {
    wallStarted = true;
    layoutWall();
    const t0 = performance.now();
    let last = -1;
    const frame = (now) => {
      const p = Math.min(1, (now - t0) / W.dur);
      const x = W.start + (W.end - W.start) * glide(p);
      track.style.transform = `translate3d(${x}px,0,0)`;
      const centre = window.innerWidth / 2 - x - W.size / 2;
      const cur = Math.max(0, Math.min(N - 1, Math.round(centre / W.step)));
      if (cur !== last) { introCount.textContent = `${pad(cur + 1)} / ${pad(N)}`; last = cur; }
      setIntroTimeline(cur, glide(p));
      if (p < 1) rafId = requestAnimationFrame(frame);
      else introTimers.push(setTimeout(settle, 700));
    };
    rafId = requestAnimationFrame(frame);
  }

  function playIntro() {
    introRunning = true;
    wallStarted = false;
    window.scrollTo(0, 0);
    document.body.classList.add("intro-on", "no-scroll");
    intro.classList.remove("t1", "t2", "t3", "is-leaving");
    intro.style.removeProperty("visibility");
    wall.style.visibility = "";
    track.style.transform = `translate3d(${window.innerWidth + 10}px,0,0)`;
    grid.classList.add("is-settling");
    const at = (ms, fn) => introTimers.push(setTimeout(fn, ms));
    at(150, () => intro.classList.add("t1"));
    at(1100, () => intro.classList.add("t2"));
    at(3500, () => { intro.classList.add("t3"); runWall(); });
  }

  function clearIntroTimers() {
    introTimers.forEach(clearTimeout);
    introTimers = [];
    cancelAnimationFrame(rafId);
  }

  // FLIP: every grid cover starts where its twin sits on the wall, then flies home.
  function settle() {
    if (!introRunning) return;
    introRunning = false;
    clearIntroTimers();
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
      wall.style.visibility = "hidden";
      void grid.offsetWidth; // commit start positions
      requestAnimationFrame(() => {
        cardArts.forEach((art, i) => {
          art.style.transition = `transform 1.25s cubic-bezier(.16,1,.3,1) ${i * 45}ms`;
          art.style.transform = "";
        });
      });
    }

    intro.classList.add("is-leaving");
    const total = canFly ? 1250 + N * 45 : 900;
    setTimeout(() => {
      document.body.classList.remove("intro-on", "no-scroll");
      intro.classList.remove("is-leaving");
      grid.classList.remove("is-flying", "is-settling");
      cardArts.forEach((art) => {
        art.style.transition = art.style.transformOrigin = art.style.zIndex = art.style.position = "";
      });
    }, total);
    // labels fade in as the covers land
    setTimeout(() => grid.classList.remove("is-settling"), canFly ? 900 : 300);
  }

  $("#skipIntro").addEventListener("click", () => {
    if (!wallStarted) { // still on the title card: just fade away
      introRunning = true;
      wallStarted = false;
    }
    settle();
  });
  document.addEventListener("keydown", (e) => {
    if (introRunning && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); settle(); }
  });
  $("#replayIntro").addEventListener("click", () => { if (!introRunning) playIntro(); });
  window.addEventListener("resize", () => { if (introRunning && wallStarted) layoutWall(); });

  /* ---------------------------------------------------------
     LISTENING VIEW + YouTube
     --------------------------------------------------------- */
  const listen = $("#listen");
  const listenCover = $("#listenCover");
  const vinyl = $("#vinyl");
  const vinylLabel = $("#vinylLabel");
  const fallback = $("#ytFallback");
  const ytLink = $("#ytLink");
  const setListenTimeline = buildTimeline($("#listenTimeline"), true);
  let current = -1;
  let player = null;
  let playerReady = false;
  let pendingId = null;
  let lastFocus = null;

  let apiPromise = null;
  // If YouTube can't load (blocked network, ad blocker, preview host), offer the link instead.
  let ytWatchdog = 0;
  function armWatchdog() {
    clearTimeout(ytWatchdog);
    ytWatchdog = setTimeout(() => { if (!playerReady) fallback.hidden = false; }, 5000);
  }
  function loadYT() {
    armWatchdog();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(window.YT); };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  function playVideo(id) {
    ytLink.href = `https://www.youtube.com/watch?v=${id}`;
    if (player && playerReady) { fallback.hidden = true; player.loadVideoById(id); return; }
    pendingId = id;
    if (player) return; // still booting; onReady will pick up pendingId
    loadYT().then((YT) => {
      player = new YT.Player("ytPlayer", {
        host: "https://www.youtube-nocookie.com",
        videoId: pendingId,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: (e) => {
            playerReady = true;
            if (pendingId && e.target.getVideoData().video_id !== pendingId) e.target.loadVideoById(pendingId);
            else e.target.playVideo();
            pendingId = null;
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            vinyl.classList.toggle("is-spinning", e.data === S.PLAYING);
            if (e.data === S.PLAYING) fallback.hidden = true;
            if (e.data === S.ENDED && !listen.hidden) go(current + 1, true);
          },
          onError: () => { fallback.hidden = false; vinyl.classList.remove("is-spinning"); }
        }
      });
    });
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
    ytLink.href = `https://www.youtube.com/watch?v=${c.yt}`;
    listen.style.setProperty("--tint", c.tint || "#006767");
    $("#listenGlow").style.setProperty("--tint", c.tint || "#006767");
    setListenTimeline(i);
    cards.forEach((card, k) => card.classList.toggle("is-current", k === i));
    try { history.replaceState(null, "", `#${c.slug}`); } catch (e) { /* file:// etc. */ }
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
    if (autoplay) playVideo(COVERS[current].yt);
    else { pendingId = COVERS[current].yt; ytLink.href = `https://www.youtube.com/watch?v=${pendingId}`; playVideoIdle(pendingId); }
  }

  // Deep link: show the player cued (browsers block autoplay without a click)
  function playVideoIdle(id) {
    loadYT().then((YT) => {
      if (player) return;
      player = new YT.Player("ytPlayer", {
        host: "https://www.youtube-nocookie.com",
        videoId: id,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => { playerReady = true; pendingId = null; },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            vinyl.classList.toggle("is-spinning", e.data === S.PLAYING);
            if (e.data === S.ENDED && !listen.hidden) go(current + 1, true);
          },
          onError: () => { fallback.hidden = false; }
        }
      });
    });
  }

  let swapTimer = 0;
  function go(i, autoplay = true) {
    const next = (i + N) % N;
    if (next === current) return;
    current = next;
    clearTimeout(swapTimer);
    listen.classList.add("is-swapping");
    vinyl.classList.remove("is-out", "is-spinning");
    swapTimer = setTimeout(() => {
      fill(current);
      listen.classList.remove("is-swapping");
      setTimeout(() => vinyl.classList.add("is-out"), reduceMotion ? 0 : 250);
    }, reduceMotion ? 0 : 320);
    if (autoplay) playVideo(COVERS[current].yt);
  }

  function close() {
    if (listen.hidden) return;
    if (player && playerReady && player.stopVideo) player.stopVideo();
    vinyl.classList.remove("is-out", "is-spinning");
    listen.classList.remove("is-open");
    cards.forEach((card) => card.classList.remove("is-current"));
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* noop */ }
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
     Start
     --------------------------------------------------------- */
  document.body.classList.remove("is-loading");
  const deep = COVERS.findIndex((c) => `#${c.slug}` === location.hash);
  if (deep >= 0) {
    open(deep, false);
  } else if (!reduceMotion && store.get("introSeen") !== "1") {
    playIntro();
  }
})();
