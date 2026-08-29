export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "refactor", "test", "chore", "build", "ci", "perf", "revert"],
    ],
    "scope-enum": [
      2,
      "always",
      ["cli", "desktop", "core", "contracts", "image-engine", "docs", "deps", "types"],
    ],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 100],
  },
};
