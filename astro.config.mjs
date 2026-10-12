// @ts-check
import { readFileSync } from "node:fs";
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const posts = JSON.parse(readFileSync(new URL("./src/data/posts.json", import.meta.url), "utf8"));
const lastmods = new Map(
  posts.map((post) => [`https://cryptocurrencyscripts.com/${post.slug}/`, post.modified || post.date]),
);

export default defineConfig({
  site: "https://cryptocurrencyscripts.com",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter(page) {
        const pathname = new URL(page).pathname;
        if (pathname === "/search/" || pathname === "/contact/" || pathname === "/feed/" || pathname === "/sitemap.xml/" || pathname === "/admin/" || pathname === "/cms/") return false;
        if (/^\/blog\/\d+\/$/.test(pathname)) return false;
        if (/^\/category\/.+\/\d+\/$/.test(pathname)) return false;
        return true;
      },
      serialize(item) {
        const pathname = new URL(item.url).pathname;
        const lastmod = lastmods.get(item.url);
        let changefreq = "weekly";
        let priority = 0.6;
        if (pathname === "/") {
          changefreq = "weekly";
          priority = 1;
        } else if (pathname === "/blog/" || pathname === "/sitemap/") {
          changefreq = "daily";
          priority = 0.9;
        } else if (lastmods.has(item.url)) {
          changefreq = "monthly";
          priority = 0.8;
        } else if (pathname.startsWith("/category/")) {
          changefreq = "weekly";
          priority = 0.7;
        } else if (pathname.startsWith("/tag/")) {
          changefreq = "monthly";
          priority = 0.4;
        } else if (pathname === "/about-us/" || pathname === "/contact-us/") {
          changefreq = "yearly";
          priority = 0.5;
        }
        return {
          ...item,
          lastmod: lastmod ? new Date(lastmod).toISOString() : new Date().toISOString(),
          changefreq,
          priority,
        };
      },
    }),
  ],
  redirects: {
    "/contact": "/contact-us/",
    "/admin": "/cms/",
  },
});
