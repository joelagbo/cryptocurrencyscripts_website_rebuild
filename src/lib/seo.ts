import { getPosts, type Post } from "./content";

export const SITE_URL = "https://cryptocurrencyscripts.com";
export const SITE_NAME = "CryptocurrencyScripts";
export const DEFAULT_IMAGE = "/uploads/2022/12/cropped-cropped-Group-16-2.png";

export function absoluteUrl(path: string) {
  if (!path) return new URL(DEFAULT_IMAGE, SITE_URL).href;
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path, SITE_URL).href;
}

export function pageUrl(pathname: string) {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname.endsWith("/") || pathname.endsWith(".xml") ? pathname : `${pathname}/`;
  }
  const path = pathname.endsWith("/") || pathname.endsWith(".xml") ? pathname : `${pathname}/`;
  return new URL(path, SITE_URL).href;
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(DEFAULT_IMAGE),
      width: 523,
      height: 519,
    },
    sameAs: [
      "https://www.facebook.com/scriptscrypto/",
      "https://x.com/ScriptsCrypto",
      "https://cryptocurrencyscripts.substack.com/",
      "https://cryptoscripts.medium.com/",
      "https://ng.linkedin.com/company/cryptocurrencyscripts",
    ],
    email: "Support@cryptocurrencyscripts.com",
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: "Expert marketing, content, and technical writing for crypto and web3 projects.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search/?s={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function articleJsonLd(post: Post, title: string, description: string) {
  return {
    "@type": "BlogPosting",
    "@id": `${SITE_URL}/${post.slug}/#article`,
    headline: title,
    description,
    datePublished: post.date,
    dateModified: post.modified || post.date,
    mainEntityOfPage: `${SITE_URL}/${post.slug}/`,
    image: post.featuredImage ? [absoluteUrl(post.featuredImage)] : undefined,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function postLastmodMap() {
  return new Map(getPosts().map((post) => [`${SITE_URL}/${post.slug}/`, post.modified || post.date]));
}
