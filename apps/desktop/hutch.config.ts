export default {
  electrobun: { version: "2.0.1" },
  packageManager: "bun",
  scripts: {
    install: ["hutch", "pm", "install", "--frozen-lockfile"],
    start: "hutch pm exec -- vite build && hutch electrobun dev",
    dev: "hutch pm exec -- vite build && hutch electrobun dev --watch",
    build: "hutch pm exec -- vite build && hutch electrobun build --env=stable",
  },
};

