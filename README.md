# topia

Link-in-bio site for Topia: looping background video (tap for sound to see it full-screen), socials, latest releases, a browsable discography with song search, and a preview player.

Plain static site — no build step. Open `index.html` through any static server. Pushes to `main` deploy to Vercel automatically.

- `assets/hero.mp4` / `hero-portrait.mp4` — 15s loops cut from Patience, Creatine and Alarm at normal speed. The portrait cut is used on tall screens; the blur is applied in CSS so it can lift when sound is on.
- `discography.json` — albums, EPs, singles and features from Apple's public catalog. Refresh with `node scripts/update-discography.mjs`.
