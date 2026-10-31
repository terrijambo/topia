// Rebuilds discography.json from Apple's public catalog. Run: node scripts/update-discography.mjs
import { writeFileSync } from "node:fs";

const ARTIST_ID = 1577058832;
const lookup = (q) => fetch(`https://itunes.apple.com/lookup?${q}`).then((r) => r.json()).then((j) => j.results);

const art = (u) => u.replace(/\/\d+x\d+bb\./, "/600x600bb.");
const cleanName = (n) => n.replace(/ - (Single|EP)$/, "");
// One credit lists a YouTube URL as a featured artist; drop it from the title.
const cleanTitle = (n) => n.replace(/ & https?:\/\/[^)]+/, "");
const kind = (c) => (/ - Single$/.test(c.collectionName) ? "single" : / - EP$/.test(c.collectionName) || c.trackCount <= 6 ? "ep" : "album");

const track = (t) => ({
  title: cleanTitle(t.trackName),
  n: t.trackNumber,
  ms: t.trackTimeMillis,
  preview: t.previewUrl,
  apple: t.trackViewUrl.split("&uo=")[0],
});

// Topia's own releases, with full tracklists.
const albums = (await lookup(`id=${ARTIST_ID}&entity=album&limit=200`)).filter((r) => r.wrapperType === "collection");
const releases = [];
for (const a of albums) {
  const tracks = (await lookup(`id=${a.collectionId}&entity=song`)).filter((r) => r.wrapperType === "track");
  releases.push({
    id: a.collectionId,
    title: cleanName(a.collectionName),
    type: kind(a),
    date: a.releaseDate.slice(0, 10),
    art: art(a.artworkUrl100),
    apple: a.collectionViewUrl.split("?")[0],
    tracks: tracks.sort((x, y) => x.discNumber - y.discNumber || x.trackNumber - y.trackNumber).map(track),
  });
}

// Songs Topia appears on under other artists' releases.
const own = new Set(albums.map((a) => a.collectionId));
const songs = (await lookup(`id=${ARTIST_ID}&entity=song&limit=200`)).filter((r) => r.wrapperType === "track" && !own.has(r.collectionId));
const features = songs.map((s) => ({
  id: s.trackId,
  title: cleanTitle(s.trackName),
  type: "feature",
  artist: s.artistName,
  date: s.releaseDate.slice(0, 10),
  art: art(s.artworkUrl100),
  apple: s.trackViewUrl.split("&uo=")[0],
  tracks: [track(s)],
}));

const all = [...releases, ...features].sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(new URL("../discography.json", import.meta.url), JSON.stringify(all));
const count = (t) => all.filter((r) => r.type === t).length;
console.log(`albums ${count("album")}, eps ${count("ep")}, singles ${count("single")}, features ${count("feature")}`);
