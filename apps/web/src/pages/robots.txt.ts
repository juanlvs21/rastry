import type { APIRoute } from "astro";
import { siteUrl } from "../lib/content";

export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /preview/",
    "Disallow: /internal/",
    "Sitemap: " + siteUrl + "/sitemap-index.xml",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
