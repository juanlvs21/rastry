import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://rastry.juanl.dev",
  output: "static",
  trailingSlash: "always",
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/preview/") && !page.includes("/internal/"),
    }),
    starlight({
      title: "Rastry",
      description: "Local-first image optimization and transformation for the CLI and desktop.",
      favicon: "/favicon.svg",
      disable404Route: true,
      logo: {
        src: "./src/assets/rastry-mark.svg",
        alt: "Rastry",
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/juanldev/rastry" }],
      customCss: ["./src/styles/starlight.css"],
      components: {
        Head: "./src/components/Head.astro",
        ThemeProvider: "./src/components/ThemeProvider.astro",
        ThemeSelect: "./src/components/ThemeSelect.astro",
      },
      sidebar: [
        {
          label: "Get started",
          items: [
            { label: "Introduction", link: "/docs/" },
            { label: "Installation", link: "/docs/install/" },
            { label: "Quickstart", link: "/docs/quickstart/" },
            { label: "Desktop workflow", link: "/docs/desktop/" },
          ],
        },
        {
          label: "Use Rastry",
          items: [
            { label: "CLI reference", link: "/docs/cli/" },
            { label: "Operations", link: "/docs/operations/" },
            { label: "Batches", link: "/docs/batches/" },
            { label: "Pipelines", link: "/docs/pipelines/" },
            { label: "Presets", link: "/docs/presets/" },
            { label: "Configuration", link: "/docs/configuration/" },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "Operations",
              items: [
                { label: "Resize", link: "/operations/resize/" },
                { label: "Crop", link: "/operations/crop/" },
                { label: "Trim", link: "/operations/trim/" },
                { label: "Padding", link: "/operations/padding/" },
                { label: "Convert", link: "/operations/convert/" },
                { label: "Strip metadata", link: "/operations/strip-metadata/" },
              ],
            },
            {
              label: "Formats",
              items: [
                { label: "PNG", link: "/formats/png/" },
                { label: "JPEG", link: "/formats/jpeg/" },
                { label: "WebP", link: "/formats/webp/" },
              ],
            },
            { label: "Presets", link: "/presets/" },
          ],
        },
        {
          label: "Solve common tasks",
          items: [
            { label: "Guides", link: "/guides/" },
            { label: "Optimize images for the web", link: "/guides/optimize-images-for-web/" },
            { label: "Convert PNG to WebP", link: "/guides/convert-png-to-webp/" },
            { label: "Batch resize images", link: "/guides/batch-resize-images/" },
          ],
        },
        {
          label: "Project",
          items: [
            { label: "Changelog", link: "/releases/" },
            { label: "License", link: "/license/" },
            { label: "Privacy", link: "/privacy/" },
            { label: "Trademark", link: "/trademark/" },
            { label: "Contribute", link: "/docs/contribution/" },
            { label: "RSS feed", link: "https://rastry.juanl.dev/feed.xml" },
          ],
        },
      ],
    }),
  ],
});
