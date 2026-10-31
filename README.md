# topia

Link-in-bio site for Topia: looping background video (tap for sound to see it full-screen), socials, latest releases, a browsable discography with song search, and a preview player.

Plain static site — no build step. Open `index.html` through any static server. Pushes to `main` deploy to Vercel automatically.

- `assets/videos/` — full Patience, Creatine and Alarm videos (landscape + portrait cuts) that play back to back with crossfades. Blur is applied in CSS so it lifts when sound is on.
- `discography.json` — albums, EPs, singles and features from Apple's public catalog. Refresh with `node scripts/update-discography.mjs`.
