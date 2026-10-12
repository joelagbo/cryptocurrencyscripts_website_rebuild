import postsData from "../data/posts.json";
import categoriesData from "../data/categories.json";
import tagsData from "../data/tags.json";

export interface Post {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: string;
  excerpt: string;
  excerptText: string;
  content: string;
  categories: number[];
  tags: number[];
  featuredImage: string;
  seoTitle: string;
  seoDescription: string;
  readingTime: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  count: number;
}

export interface Tag {
  id: number;
  slug: string;
  name: string;
  count: number;
}

const posts = postsData as Post[];
const categories = categoriesData as Category[];
const tags = tagsData as Tag[];

export const POSTS_PER_PAGE = 4;
export const reservedSlugs = new Set([
  "blog",
  "contact-us",
  "about-us",
  "contact",
  "category",
  "tag",
  "search",
]);

export function getPosts(): Post[] {
  return [...posts].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPost(slug: string) {
  return getPosts().find((p) => p.slug === slug);
}

export function getCategories(): Category[] {
  return categories;
}

export function getTags(): Tag[] {
  return tags;
}

export function categoryById(id: number) {
  return categories.find((c) => c.id === id);
}

export function tagById(id: number) {
  return tags.find((t) => t.id === id);
}

export function postsByCategory(slug: string) {
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return [];
  return getPosts().filter((p) => p.categories.includes(cat.id));
}

export function postsByTag(slug: string) {
  const tag = tags.find((t) => t.slug === slug);
  if (!tag) return [];
  return getPosts().filter((p) => p.tags.includes(tag.id));
}

export function decodeEntities(value: string) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function plainTitle(post: Post) {
  return decodeEntities(post.seoTitle || post.title).replace(/\s+-\s+CryptocurrencyScripts$/i, "") || decodeEntities(post.title);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    current,
    totalPages,
    total: items.length,
  };
}

export function relatedPosts(post: Post, limit = 5) {
  return getPosts()
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const aShare = a.categories.filter((id) => post.categories.includes(id)).length;
      const bShare = b.categories.filter((id) => post.categories.includes(id)).length;
      return bShare - aShare;
    })
    .slice(0, limit);
}

export function neighbors(post: Post) {
  const all = getPosts();
  const i = all.findIndex((p) => p.slug === post.slug);
  return {
    newer: i > 0 ? all[i - 1] : undefined,
    older: i >= 0 && i < all.length - 1 ? all[i + 1] : undefined,
  };
}
