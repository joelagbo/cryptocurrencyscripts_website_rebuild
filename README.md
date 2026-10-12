# CryptocurrencyScripts

Static rebuild of [cryptocurrencyscripts.com](https://cryptocurrencyscripts.com) — a crypto/Web3 marketing site and blog. Originally WordPress; now a static Astro site.

## Stack

- [Astro](https://astro.build) 7 (static output)
- TypeScript
- Custom CSS (Blynex-inspired palette)

## Local setup

Requires Node.js 22.12 or later.

```bash
npm install
npm run dev
```

Dev server: `http://localhost:4321`

```bash
npm run build
npm run preview
```

Production files are written to `dist/`. Deploy that folder to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

## Content

Blog posts, categories, and tags live in `src/data/` (imported from the WordPress REST API). Images are in `public/uploads/`.

To re-import from the live WordPress site:

```bash
npm run import
npm run images
```

## Project layout

```
src/pages/          routes (home, blog, posts, contact, sitemap)
src/components/     header, footer, pagination
src/layouts/        base HTML/SEO layout
src/styles/         global CSS
src/data/           posts, categories, tags
public/             images, robots.txt, favicons
scripts/            WordPress import helpers
```

## License

Site content belongs to CryptocurrencyScripts. All rights reserved.
