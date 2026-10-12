import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://cryptocurrencyscripts.com";
const postsPath = join(ROOT, "src", "data", "posts.json");

function originalName(file) {
  return file.replace(/-\d+x\d+(?=\.[a-zA-Z0-9]+$)/, "");
}

function cleanHtml(html) {
  return html
    .replace(/\s+srcset="[^"]*"/g, "")
    .replace(/\s+sizes="[^"]*"/g, "")
    .replace(/\/uploads\/([^"' >]+)/g, (_, file) => `/uploads/${originalName(file)}`);
}

function collect(html, set) {
  const re = /\/uploads\/([^"' >]+)/g;
  let m;
  while ((m = re.exec(html))) set.add(originalName(m[1].replace(/\\/g, "/")));
}

const posts = JSON.parse(await readFile(postsPath, "utf8"));
for (const post of posts) {
  post.content = cleanHtml(post.content || "");
  post.excerpt = cleanHtml(post.excerpt || "");
  if (post.featuredImage) {
    post.featuredImage = `/uploads/${originalName(post.featuredImage.replace(/^\/uploads\//, ""))}`;
  }
}

const needed = new Set();
for (const post of posts) {
  collect(post.content, needed);
  collect(post.featuredImage, needed);
}

const extras = [
  "2025/11/Bitcoin-3310-4.jpg",
  "2025/11/uptrend.png",
  "2025/11/coingecko.png",
  "2025/11/movement.png",
  "2025/11/coingape.png",
  "2025/11/naoris.png",
  "2025/11/dexcheck.jpeg",
  "2025/11/aigo.jpeg",
  "2025/11/dailyforex.jpeg",
  "2025/11/nervos-1.png",
  "2025/11/tectum.jpeg",
  "2025/11/koi.png",
  "2025/11/MEXC.jpg",
  "2025/11/verus.png",
  "2025/11/chart-6573688_640.jpg",
  "2025/11/tg.png",
  "2025/11/stock-exchange-7044787_640.jpg",
  "2025/11/CSCG.png",
  "2025/11/CSML.png",
  "2025/11/CSDC-1.png",
  "2025/11/image.jpg",
  "2025/11/image-1.jpg",
  "2025/11/4188693.png",
  "2022/12/cropped-cropped-Group-16-2.png",
  "2022/12/cropped-cropped-Group-16-32x32.png",
  "2022/12/cropped-cropped-Group-16-192x192.png",
];
for (const extra of extras) needed.add(extra);

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function download(rel) {
  const dest = join(ROOT, "public", "uploads", rel);
  if (existsSync(dest)) return "exists";
  await mkdir(dirname(dest), { recursive: true });
  const url = `${ORIGIN}/wp-content/uploads/${rel}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${ORIGIN}/`,
      },
    });
    if (res.ok) {
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return "ok";
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(12000);
      continue;
    }
    return `fail ${res.status}`;
  }
  return "fail 429";
}

function withFallback(html) {
  return html.replace(/src="\/uploads\/([^"]+)"/g, (all, file) => {
    const dest = join(ROOT, "public", "uploads", file);
    return existsSync(dest) ? all : `src="${ORIGIN}/wp-content/uploads/${file}"`;
  });
}

const list = [...needed];
const missing = list.filter((rel) => !existsSync(join(ROOT, "public", "uploads", rel)));
console.log("have", list.length - missing.length, "need", missing.length);
let i = 0;
for (const rel of missing) {
  const status = await download(rel);
  i += 1;
  console.log(`${i}/${missing.length} ${status} ${rel}`);
  await sleep(400);
}

for (const post of posts) {
  post.content = withFallback(post.content || "");
  if (post.featuredImage?.startsWith("/uploads/")) {
    const file = post.featuredImage.replace("/uploads/", "");
    if (!existsSync(join(ROOT, "public", "uploads", file))) {
      post.featuredImage = `${ORIGIN}/wp-content/uploads/${file}`;
    }
  }
}
await writeFile(postsPath, JSON.stringify(posts, null, 2));
console.log("done");
