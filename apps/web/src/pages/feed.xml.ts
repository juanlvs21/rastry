import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteUrl } from "../lib/content";

export async function GET() {
  const entries = (await getCollection("releases")).toSorted((a, b) =>
    b.data.date.localeCompare(a.data.date),
  );

  return rss({
    title: "Rastry releases",
    description: "Local-first image workflow releases and compatibility notes.",
    site: siteUrl,
    items: entries.map((entry) => ({
      title: entry.data.version + " · " + entry.data.title,
      description: entry.data.description,
      pubDate: new Date(entry.data.date + "T00:00:00Z"),
      link: "/releases/#release-" + entry.data.version.replaceAll(".", "-"),
    })),
    customData: "<language>en</language>",
  });
}
