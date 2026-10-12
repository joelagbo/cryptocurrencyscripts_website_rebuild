import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://cryptocurrencyscripts.com";
const postsPath = join(ROOT, "src", "data", "posts.json");
const posts = JSON.parse(await readFile(postsPath, "utf8"));

function fallback(html) {
  return html.replace(/src="\/uploads\/([^"]+)"/g, (all, file) => {
    return existsSync(join(ROOT, "public", "uploads", file))
      ? all
      : `src="${ORIGIN}/wp-content/uploads/${file}"`;
  });
}

for (const post of posts) {
  post.content = fallback(post.content || "");
  if (post.featuredImage?.startsWith("/uploads/")) {
    const file = post.featuredImage.replace("/uploads/", "");
    if (!existsSync(join(ROOT, "public", "uploads", file))) {
      post.featuredImage = `${ORIGIN}/wp-content/uploads/${file}`;
    }
  }
}

await writeFile(postsPath, JSON.stringify(posts, null, 2));
console.log("fallback applied", posts.length);
