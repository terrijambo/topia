# topia

Link-in-bio site for Topia: looping background video, socials, latest releases, and a searchable song list with 30-second previews.

Plain static site — no build step. Open `index.html` through any static server.

- `assets/hero.mp4` — 15s loop cut from Patience, I Tangiriko, Make Life and Alarm (0.75x speed, light blur, 720p).
- `songs.json` — catalog from Apple's public lookup API. Refresh with `node scripts/update-songs.mjs`.
