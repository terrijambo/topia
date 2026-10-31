const $ = (id) => document.getElementById(id);
const video = $("bg-video");
const bg = document.querySelector(".bg");
const soundBtn = $("sound");
const audio = $("audio");
const root = document.documentElement;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "");
const icon = (name) => `<svg><use href="#i-${name}"/></svg>`;

/* ---------- background video: portrait cut on tall screens ---------- */
const portrait = matchMedia("(max-aspect-ratio: 1/1)");
function pickVideo() {
  const name = portrait.matches ? "hero-portrait" : "hero";
  if (video.dataset.name === name) return;
  const t = video.currentTime || 0;
  video.dataset.name = name;
  video.poster = `/assets/${name === "hero" ? "hero-poster" : "hero-poster-portrait"}.jpg`;
  video.src = `/assets/${name}.mp4`;
  video.currentTime = t;
  video.play().catch(() => {});
}
pickVideo();
portrait.addEventListener("change", pickVideo);

/* ---------- immersive sound mode ---------- */
function setImmersive(on) {
  document.body.classList.toggle("immersive", on);
  video.muted = !on;
  if (on) {
    audio.pause();
    video.play().catch(() => {});
  }
  soundBtn.setAttribute("aria-pressed", String(on));
  soundBtn.setAttribute("aria-label", on ? "Mute and show the site" : "Unmute background video");
  soundBtn.classList.add("compact");
}
soundBtn.addEventListener("click", () => setImmersive(video.muted));
bg.addEventListener("click", () => document.body.classList.contains("immersive") && setImmersive(false));
addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("sheet").hidden) closeSheet();
  else if (document.body.classList.contains("immersive")) setImmersive(false);
});
addEventListener("scroll", () => soundBtn.classList.add("compact"), { once: true, passive: true });

/* ---------- track helpers ---------- */
const spotifyUrl = (t) => `https://open.spotify.com/search/${encodeURIComponent(`${t.title} topia`)}`;
const youtubeUrl = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`topia ${t.title}`)}`;
const linksHtml = (t) => `
  <a href="${spotifyUrl(t)}" target="_blank" rel="noopener" aria-label="${esc(t.title)} on Spotify" title="Spotify">${icon("spotify")}</a>
  <a href="${t.apple}" target="_blank" rel="noopener" aria-label="${esc(t.title)} on Apple Music" title="Apple Music">${icon("apple")}</a>
  <a href="${youtubeUrl(t)}" target="_blank" rel="noopener" aria-label="${esc(t.title)} on YouTube" title="YouTube">${icon("youtube")}</a>`;

const TYPE_LABEL = { album: "Album", ep: "EP", single: "Single", feature: "Feature" };

/* ---------- player ---------- */
const player = $("player");
let queue = [];
let qi = -1;

function currentKey() {
  return qi >= 0 ? queue[qi].key : null;
}

function setPlayerHeight() {
  const h = player.hidden ? 0 : player.offsetHeight + 12;
  root.style.setProperty("--player-h", `${h}px`);
}

function playQueue(tracks, start = 0) {
  queue = tracks.filter((t) => t.preview);
  if (!queue.length) return;
  playAt(Math.max(0, queue.findIndex((t) => t.key === tracks[start].key)));
}

function playAt(i) {
  if (i < 0 || i >= queue.length) return;
  qi = i;
  const t = queue[i];
  if (document.body.classList.contains("immersive")) setImmersive(false);
  video.muted = true;
  audio.src = t.preview;
  audio.play().catch(() => {});
  $("p-art").src = t.art;
  $("p-title").textContent = t.title;
  $("p-sub").textContent = `${t.release} · preview`;
  player.hidden = false;
  setPlayerHeight();
  markPlaying();
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: "Topia", album: t.release, artwork: [{ src: t.art, sizes: "600x600" }] });
  }
}

function toggle() {
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
}

function closePlayer() {
  audio.pause();
  player.hidden = true;
  qi = -1;
  setPlayerHeight();
  markPlaying();
}

function syncToggle() {
  const on = !audio.paused;
  player.classList.toggle("on", on);
  $("p-toggle").innerHTML = icon(on ? "pause" : "play");
  $("p-toggle").setAttribute("aria-label", on ? "Pause" : "Play");
  $("sheet-play").innerHTML = `${icon(on && sheetRelease && queue[qi]?.releaseId === sheetRelease.id ? "pause" : "play")}Play previews`;
}

audio.addEventListener("play", syncToggle);
audio.addEventListener("pause", syncToggle);
audio.addEventListener("ended", () => (qi < queue.length - 1 ? playAt(qi + 1) : syncToggle()));
audio.addEventListener("timeupdate", () => {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  $("p-fill").style.width = `${pct}%`;
  $("p-bar").setAttribute("aria-valuenow", Math.round(audio.currentTime));
});

$("p-toggle").addEventListener("click", toggle);
$("p-prev").addEventListener("click", () => (audio.currentTime > 3 ? (audio.currentTime = 0) : playAt(qi - 1)));
$("p-next").addEventListener("click", () => playAt(qi + 1));
$("p-close").addEventListener("click", closePlayer);

const bar = $("p-bar");
function seek(e) {
  const r = bar.getBoundingClientRect();
  if (audio.duration) audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
}
bar.addEventListener("pointerdown", (e) => {
  bar.setPointerCapture(e.pointerId);
  seek(e);
  bar.onpointermove = seek;
});
bar.addEventListener("pointerup", () => (bar.onpointermove = null));
bar.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") audio.currentTime += 5;
  if (e.key === "ArrowLeft") audio.currentTime -= 5;
});
addEventListener("resize", setPlayerHeight);

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("previoustrack", () => playAt(qi - 1));
  navigator.mediaSession.setActionHandler("nexttrack", () => playAt(qi + 1));
}

/* ---------- discography ---------- */
let releases = [];
let allTracks = [];
let filter = "all";

const FILTERS = [
  ["all", "All"],
  ["album", "Albums"],
  ["ep", "EPs"],
  ["single", "Singles"],
  ["feature", "Features"],
];

function renderChips() {
  $("chips").innerHTML = FILTERS.map(([key, label]) => {
    const n = key === "all" ? releases.length : releases.filter((r) => r.type === key).length;
    return `<button class="chip" role="tab" type="button" data-f="${key}" aria-selected="${filter === key}">${label} <b>${n}</b></button>`;
  }).join("");
}

function renderGrid() {
  const list = filter === "all" ? releases : releases.filter((r) => r.type === filter);
  const playingRelease = qi >= 0 ? queue[qi].releaseId : null;
  $("grid").innerHTML = list
    .map(
      (r, i) => `
    <button class="tile${r.id === playingRelease ? " playing" : ""}" type="button" data-r="${r.id}" style="animation-delay:${Math.min(i, 12) * 30}ms">
      <span class="tile-art">
        <img src="${r.art}" alt="" loading="lazy" />
        <span class="tile-play" data-play="${r.id}" aria-hidden="true">${icon("play")}</span>
      </span>
      <span class="tile-name">${esc(r.title)}</span>
      <span class="tile-sub">${TYPE_LABEL[r.type]} · ${r.date.slice(0, 4)}${r.artist ? ` · ${esc(r.artist)}` : ""}</span>
    </button>`
    )
    .join("");
  $("disco-count").textContent = `${allTracks.length} songs`;
}

function renderHits(q) {
  const hits = allTracks.filter((t) => t.search.includes(q)).slice(0, 40);
  const key = currentKey();
  $("hits").innerHTML = hits.length
    ? hits
        .map(
          (t) => `
      <li class="hit${t.key === key ? " is-playing" : ""}" data-k="${t.key}">
        <button class="hit-art" type="button" aria-label="Play preview of ${esc(t.title)}">
          <img src="${t.art}" alt="" loading="lazy" /><span>${icon(t.key === key && !audio.paused ? "pause" : "play")}</span>
        </button>
        <div class="t-text" data-open="${t.releaseId}">
          <div class="t-title">${esc(t.title)}</div>
          <div class="t-sub">${esc(t.release)} · ${TYPE_LABEL[t.type]} · ${t.date.slice(0, 4)}</div>
        </div>
        <div class="track-links">${linksHtml(t)}</div>
      </li>`
        )
        .join("")
    : `<li class="empty">Nothing matches “${esc($("search").value.trim())}”</li>`;
  $("hits").dataset.keys = hits.map((t) => t.key).join(",");
}

function render() {
  const q = norm($("search").value.trim());
  $("grid").hidden = !!q;
  $("chips").hidden = !!q;
  $("hits").hidden = !q;
  if (q) renderHits(q);
  else renderGrid();
}

function markPlaying() {
  render();
  if (!$("sheet").hidden) renderSheetTracks();
  syncToggle();
}

$("chips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  filter = chip.dataset.f;
  renderChips();
  renderGrid();
});

$("grid").addEventListener("click", (e) => {
  const tile = e.target.closest(".tile");
  if (!tile) return;
  const r = releases.find((x) => x.id == tile.dataset.r);
  if (e.target.closest(".tile-play")) playQueue(r.tracks);
  else openSheet(r);
});

$("hits").addEventListener("click", (e) => {
  const row = e.target.closest(".hit");
  if (!row || e.target.closest("a")) return;
  if (e.target.closest(".hit-art")) {
    if (row.dataset.k === currentKey()) return toggle();
    const keys = $("hits").dataset.keys.split(",");
    const tracks = keys.map((k) => allTracks.find((t) => t.key === k));
    return playQueue(tracks, keys.indexOf(row.dataset.k));
  }
  const open = e.target.closest("[data-open]");
  if (open) openSheet(releases.find((r) => r.id == open.dataset.open));
});

$("search").addEventListener("input", render);

/* ---------- release sheet ---------- */
let sheetRelease = null;

function fmt(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderSheetTracks() {
  const key = currentKey();
  $("sheet-tracks").innerHTML = sheetRelease.tracks
    .map(
      (t, i) => `
    <li class="track${t.key === key ? " is-playing" : ""}" data-i="${i}">
      <button class="track-n" type="button" aria-label="Play preview of ${esc(t.title)}"><span>${i + 1}</span>${icon(t.key === key && !audio.paused ? "pause" : "play")}</button>
      <div class="t-text">
        <div class="t-title">${esc(t.title)}</div>
        <div class="t-sub">${t.ms ? fmt(t.ms) : ""}</div>
      </div>
      <div class="track-links">${linksHtml(t)}</div>
    </li>`
    )
    .join("");
}

function openSheet(r) {
  sheetRelease = r;
  $("sheet-art").src = r.art;
  $("sheet-type").textContent = TYPE_LABEL[r.type];
  $("sheet-title").textContent = r.title;
  const n = r.tracks.length;
  $("sheet-sub").textContent = [r.artist || "Topia", r.date.slice(0, 4), `${n} ${n === 1 ? "song" : "songs"}`].join(" · ");
  $("sheet-links").innerHTML = linksHtml({ title: r.title, apple: r.apple });
  renderSheetTracks();
  $("sheet").hidden = false;
  document.body.classList.add("sheet-open");
  syncToggle();
}

function closeSheet() {
  $("sheet").hidden = true;
  document.body.classList.remove("sheet-open");
}

$("sheet").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) return closeSheet();
  const row = e.target.closest(".track");
  if (!row || e.target.closest("a")) return;
  const t = sheetRelease.tracks[row.dataset.i];
  if (t.key === currentKey()) toggle();
  else playQueue(sheetRelease.tracks, Number(row.dataset.i));
});

$("sheet-play").addEventListener("click", () => {
  if (queue[qi]?.releaseId === sheetRelease.id) toggle();
  else playQueue(sheetRelease.tracks);
});

/* ---------- load ---------- */
fetch("/discography.json")
  .then((r) => r.json())
  .then((data) => {
    releases = data;
    for (const r of releases) {
      r.tracks = r.tracks.map((t, i) => ({
        ...t,
        key: `${r.id}-${i}`,
        releaseId: r.id,
        release: r.title,
        type: r.type,
        date: r.date,
        art: r.art,
        search: norm(`${t.title} ${r.title} ${r.artist || ""}`),
      }));
    }
    // Search shows each song once, preferring the album/EP version over the single.
    const rank = { album: 0, ep: 1, single: 2, feature: 3 };
    const seen = new Map();
    for (const t of releases.flatMap((r) => r.tracks)) {
      const id = norm(t.title.replace(/\s*\(feat\..*?\)|\s*\[.*?\]/gi, ""));
      const prev = seen.get(id);
      if (!prev || rank[t.type] < rank[prev.type]) seen.set(id, t);
    }
    allTracks = [...seen.values()];
    renderChips();
    render();
  })
  .catch(() => {
    $("grid").innerHTML = '<p class="empty">Couldn’t load the discography — try <a href="https://open.spotify.com/artist/1vgQvNLiBuDbhiJd5gLlB6">Spotify</a>.</p>';
  });
