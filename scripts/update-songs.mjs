// Refreshes songs.json from Apple's public catalog. Run: node scripts/update-songs.mjs
import { writeFileSync } from "node:fs";

const ARTIST_ID = 1577058832;
const res = await fetch(`https://itunes.apple.com/lookup?id=${ARTIST_ID}&entity=song&limit=200`);
const { results } = await res.json();

// The same track often appears on a single and an album; keep the earliest release.
const byTitle = new Map();
for (const r of results.filter((r) => r.wrapperType === "track")) {
  const key = r.trackName.toLowerCase().replace(/\s*\(feat\..*?\)|\s*\[.*?\]/g, "").trim();
  const prev = byTitle.get(key);
  if (!prev || r.releaseDate < prev.releaseDate) byTitle.set(key, r);
}

const songs = [...byTitle.values()]
  .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
  .map((r) => ({
    title: r.trackName,
    album: r.collectionName.replace(/ - (Single|EP)$/, ""),
    year: r.releaseDate.slice(0, 4),
    art: r.artworkUrl100.replace("100x100bb", "300x300bb"),
    preview: r.previewUrl,
    apple: r.trackViewUrl.split("&uo=")[0],
  }));

writeFileSync(new URL("../songs.json", import.meta.url), JSON.stringify(songs, null, 1));
console.log(`wrote ${songs.length} songs`);
