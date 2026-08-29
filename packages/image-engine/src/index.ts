import type { ExecutionPlan } from "@rastry/contracts";

export type ImageEngine = {
  execute(plan: ExecutionPlan): Promise<never>;
};

export function createImageEngine(): ImageEngine {
  return {
    async execute(_plan) {
      throw new Error(
        "The Bun image-engine spike is not implemented. The initial scaffold supports planning only.",
      );
    },
  };
}

