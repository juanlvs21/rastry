import type { CollectionEntry } from "astro:content";

export const siteUrl = "https://rastry.juanl.dev";
export const repositoryUrl = "https://github.com/juanlvs21/rastry";

type CatalogEntry =
  | CollectionEntry<"operations">
  | CollectionEntry<"formats">
  | CollectionEntry<"presets">
  | CollectionEntry<"guides">;

export function assertUniqueSlugs(entries: CatalogEntry[], collectionName: string): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    const entrySlug = entry.data.slug;
    if (seen.has(entrySlug)) {
      throw new Error("Duplicate " + collectionName + " slug: " + entrySlug);
    }
    seen.add(entrySlug);
    if (entry.id !== entrySlug) {
      throw new Error(
        "The " +
          collectionName +
          " entry " +
          entry.id +
          " must use the same slug in frontmatter and filename.",
      );
    }
  }
}

export function canonicalUrl(pathname: string): string {
  return new URL(pathname, siteUrl).href;
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export function pageSchema(title: string, description: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    description,
    url: canonicalUrl(path),
    isPartOf: {
      "@type": "WebSite",
      name: "Rastry",
      url: siteUrl,
    },
  };
}
