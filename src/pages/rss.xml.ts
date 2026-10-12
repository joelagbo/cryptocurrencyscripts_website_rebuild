import rss from "@astrojs/rss";
import { getPosts, decodeEntities } from "../lib/content";

export function GET(context: { site?: URL }) {
  return rss({
    title: "CryptocurrencyScripts",
    description: "Expert marketing, content, and technical writing for crypto and web3 projects.",
    site: context.site!,
    trailingSlash: true,
    customData: "<language>en-US</language>",
    items: getPosts().map((post) => ({
      title: decodeEntities(post.title),
      description: decodeEntities(post.excerptText || post.seoDescription),
      pubDate: new Date(post.date),
      link: `/${post.slug}/`,
    })),
  });
}
