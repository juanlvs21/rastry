import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const related = z.array(z.string().min(1)).default([]);

const catalogFields = {
  title: z.string().min(1),
  description: z.string().min(1),
  slug,
  related,
};

const operations = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/operations" }),
  schema: z.object({
    ...catalogFields,
    operation: z.enum(["resize", "crop", "trim", "padding", "convert", "strip-metadata"]),
    example: z.string().min(1),
    sourcePath: z.string().min(1),
    docsPath: z.string().min(1),
  }),
});

const formats = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/formats" }),
  schema: z.object({
    ...catalogFields,
    format: z.enum(["png", "jpeg", "webp"]),
    role: z.enum(["input-and-output"]),
    example: z.string().min(1),
    sourcePath: z.string().min(1),
    docsPath: z.string().min(1),
  }),
});

const presets = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/presets" }),
  schema: z.object({
    ...catalogFields,
    preset: z.enum(["web", "ecommerce", "social"]),
    operations: z
      .array(z.enum(["resize", "crop", "trim", "padding", "convert", "strip-metadata"]))
      .min(1),
    outputFormat: z.enum(["png", "jpeg", "webp"]),
    example: z.string().min(1),
    sourcePath: z.string().min(1),
    docsPath: z.string().min(1),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/guides" }),
  schema: z.object({
    ...catalogFields,
    audience: z.string().min(1),
    example: z.string().min(1),
    docsPath: z.string().min(1),
  }),
});

const releases = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    version: z.string().regex(/^v?\d+\.\d+\.\d+$/),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.literal("release"),
    sourcePath: z.string().min(1),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  operations,
  formats,
  presets,
  guides,
  releases,
};
