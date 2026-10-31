const video = document.getElementById("bg-video");
const soundBtn = document.getElementById("sound");
const preview = document.getElementById("preview");
const list = document.getElementById("songs");
const input = document.getElementById("search");
const moreBtn = document.getElementById("more");
const countEl = document.getElementById("song-count");

document.getElementById("year").textContent = new Date().getFullYear();
video.playbackRate = 1; // speed is baked into hero.mp4 (0.75x)

/* ---------- background sound ---------- */
let wantsSound = false;

function setVideoSound(on) {
  wantsSound = on;
  video.muted = !on;
  if (on) video.play().catch(() => {});
  soundBtn.setAttribute("aria-pressed", String(on));
  soundBtn.setAttribute("aria-label", on ? "Mute background video" : "Unmute background video");
  soundBtn.classList.add("compact");
  if (on && !preview.paused) stopPreview();
}

soundBtn.addEventListener("click", () => setVideoSound(video.muted));

// Shrink the "Tap for sound" pill to an icon once the visitor starts scrolling.
addEventListener("scroll", () => soundBtn.classList.add("compact"), { once: true, passive: true });

/* ---------- song search ---------- */
const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 24 24"><path d="M7 5.5h3.5v13H7zM13.5 5.5H17v13h-3.5z" fill="currentColor"/></svg>';
const DEFAULT_SHOWN = 6;

let songs = [];
let showAll = false;
let playingIndex = -1;

const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "");
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function spotifySearch(song) {
  return `https://open.spotify.com/search/${encodeURIComponent(`${song.title} topia`)}`;
}
function youtubeSearch(song) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`topia ${song.title}`)}`;
}

function render() {
  const q = norm(input.value.trim());
  const matches = q
    ? songs.filter((s) => s._key.includes(q))
    : songs;
  const shown = q || showAll ? matches : matches.slice(0, DEFAULT_SHOWN);

  list.innerHTML = shown.length
    ? shown
        .map(
          (s) => `
      <li class="song${s._i === playingIndex ? " playing" : ""}" data-i="${s._i}">
        <button class="song-art" type="button" aria-label="Play preview of ${esc(s.title)}">
          <img src="${s.art}" alt="" loading="lazy" width="48" height="48" />
          <span>${s._i === playingIndex ? PAUSE : PLAY}</span>
        </button>
        <div class="song-text">
          <div class="song-title">${esc(s.title)}</div>
          <div class="song-sub">${esc(s.album)} · ${s.year}</div>
        </div>
        <div class="song-links">
          <a href="${spotifySearch(s)}" target="_blank" rel="noopener" aria-label="${esc(s.title)} on Spotify">Spotify</a>
          <a href="${s.apple}" target="_blank" rel="noopener" aria-label="${esc(s.title)} on Apple Music">Apple</a>
          <a class="yt" href="${youtubeSearch(s)}" target="_blank" rel="noopener" aria-label="${esc(s.title)} on YouTube">YT</a>
        </div>
      </li>`
        )
        .join("")
    : `<li class="empty">No songs match “${esc(input.value.trim())}”</li>`;

  moreBtn.hidden = !!q || showAll || matches.length <= DEFAULT_SHOWN;
  countEl.textContent = q ? `${matches.length} found` : `${songs.length} songs`;
}

function stopPreview() {
  preview.pause();
  playingIndex = -1;
  render();
}

function togglePreview(i) {
  if (playingIndex === i) return stopPreview();
  playingIndex = i;
  preview.src = songs[i].preview;
  preview.play().catch(() => {});
  // Hush the background while a preview plays; restore it afterwards.
  video.muted = true;
  render();
}

preview.addEventListener("ended", stopPreview);
preview.addEventListener("pause", () => {
  if (wantsSound) video.muted = false;
});

list.addEventListener("click", (e) => {
  const btn = e.target.closest(".song-art");
  if (btn) togglePreview(Number(btn.closest(".song").dataset.i));
});
input.addEventListener("input", render);
moreBtn.addEventListener("click", () => {
  showAll = true;
  render();
});

fetch("/songs.json")
  .then((r) => r.json())
  .then((data) => {
    songs = data.map((s, i) => ({ ...s, _i: i, _key: norm(`${s.title} ${s.album} ${s.year}`) }));
    render();
  })
  .catch(() => {
    list.innerHTML = '<li class="empty">Couldn’t load songs — try <a href="https://open.spotify.com/artist/1vgQvNLiBuDbhiJd5gLlB6">Spotify</a>.</li>';
  });
