import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://cryptocurrencyscripts.com/wp-json/wp/v2";
const ORIGIN = "https://cryptocurrencyscripts.com";

const HOME_IMAGES = [
  "/wp-content/uploads/2025/11/Bitcoin-3310-4.jpg",
  "/wp-content/uploads/2025/11/uptrend.png",
  "/wp-content/uploads/2025/11/coingecko.png",
  "/wp-content/uploads/2025/11/movement.png",
  "/wp-content/uploads/2025/11/coingape.png",
  "/wp-content/uploads/2025/11/naoris.png",
  "/wp-content/uploads/2025/11/dexcheck.jpeg",
  "/wp-content/uploads/2025/11/aigo.jpeg",
  "/wp-content/uploads/2025/11/dailyforex.jpeg",
  "/wp-content/uploads/2025/11/nervos-1.png",
  "/wp-content/uploads/2025/11/tectum.jpeg",
  "/wp-content/uploads/2025/11/koi.png",
  "/wp-content/uploads/2025/11/MEXC.jpg",
  "/wp-content/uploads/2025/11/verus.png",
  "/wp-content/uploads/2025/11/chart-6573688_640.jpg",
  "/wp-content/uploads/2025/11/tg.png",
  "/wp-content/uploads/2025/11/stock-exchange-7044787_640.jpg",
  "/wp-content/uploads/2025/11/CSCG.png",
  "/wp-content/uploads/2025/11/CSML.png",
  "/wp-content/uploads/2025/11/CSDC-1.png",
  "/wp-content/uploads/2025/11/image.jpg",
  "/wp-content/uploads/2025/11/image-1.jpg",
  "/wp-content/uploads/2025/11/4188693.png",
  "/wp-content/uploads/2022/12/cropped-cropped-Group-16-2.png",
  "/wp-content/uploads/2022/12/cropped-cropped-Group-16-32x32.png",
  "/wp-content/uploads/2022/12/cropped-cropped-Group-16-192x192.png",
  "/wp-content/uploads/2022/12/cropped-cropped-Group-16-180x180.png",
];

function rewrite(html) {
  if (!html) return "";
  return html
    .replaceAll("https://cryptocurrencyscripts.com/wp-content/uploads/", "/uploads/")
    .replaceAll("http://cryptocurrencyscripts.com/wp-content/uploads/", "/uploads/")
    .replaceAll("https://cryptocurrencyscripts.com/", "/")
    .replaceAll("http://cryptocurrencyscripts.com/", "/");
}

function collectUploadPaths(...chunks) {
  const paths = new Set();
  const re = /https?:\/\/cryptocurrencyscripts\.com\/wp-content\/uploads\/([^"'?\s>]+)/gi;
  for (const chunk of chunks) {
    if (!chunk) continue;
    let match;
    while ((match = re.exec(chunk))) {
      paths.add(match[1].replace(/\\/g, "/"));
    }
  }
  for (const rel of HOME_IMAGES) {
    paths.add(rel.replace("/wp-content/uploads/", ""));
  }
  return [...paths];
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return { json: await res.json(), headers: res.headers };
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const url = `${API}/${endpoint}?per_page=100&page=${page}`;
    const { json, headers } = await fetchJson(url);
    items.push(...json);
    totalPages = Number(headers.get("X-WP-TotalPages") || 1);
    page += 1;
  }
  return items;
}

async function download(relPath) {
  const dest = join(ROOT, "public", "uploads", relPath);
  await mkdir(dirname(dest), { recursive: true });
  const url = `${ORIGIN}/wp-content/uploads/${relPath}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("skip", res.status, url);
    return;
  }
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function stripTags(html) {
  return rewrite(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function pool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

const [rawPosts, rawCategories, rawTags] = await Promise.all([
  fetchAll("posts"),
  fetchAll("categories"),
  fetchAll("tags"),
]);

const posts = rawPosts.map((post) => {
  const yoast = post.yoast_head_json || {};
  const og = yoast.og_image?.[0] || {};
  return {
    id: post.id,
    slug: post.slug,
    date: post.date,
    modified: post.modified,
    title: rewrite(post.title?.rendered || ""),
    excerpt: rewrite(post.excerpt?.rendered || ""),
    excerptText: stripTags(post.excerpt?.rendered || ""),
    content: rewrite(post.content?.rendered || ""),
    categories: post.categories || [],
    tags: post.tags || [],
    featuredImage: og.url
      ? rewrite(og.url)
      : "",
    seoTitle: yoast.title || "",
    seoDescription: yoast.description || yoast.og_description || "",
    readingTime: yoast.twitter_misc?.["Est. reading time"] || "",
  };
});

const categories = rawCategories
  .filter((c) => c.count > 0 && c.slug !== "category")
  .map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    count: c.count,
  }));

const tags = rawTags
  .filter((t) => t.count > 0)
  .map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    count: t.count,
  }));

const imagePaths = collectUploadPaths(
  ...rawPosts.map((p) => p.content?.rendered || ""),
  ...rawPosts.map((p) => JSON.stringify(p.yoast_head_json || {})),
);

await mkdir(join(ROOT, "src", "data"), { recursive: true });
await writeFile(join(ROOT, "src", "data", "posts.json"), JSON.stringify(posts, null, 2));
await writeFile(join(ROOT, "src", "data", "categories.json"), JSON.stringify(categories, null, 2));
await writeFile(join(ROOT, "src", "data", "tags.json"), JSON.stringify(tags, null, 2));

console.log(`posts=${posts.length} categories=${categories.length} tags=${tags.length} images=${imagePaths.length}`);

let done = 0;
await pool(imagePaths, 8, async (rel) => {
  await download(rel);
  done += 1;
  if (done % 25 === 0 || done === imagePaths.length) {
    console.log(`images ${done}/${imagePaths.length}`);
  }
});

console.log("import complete");
