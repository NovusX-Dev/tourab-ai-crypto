import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    environment: "node",
    coverage: {
      enabled: false,
      provider: "v8",
      include: ["apps/dashboard/src/**/*.ts", "packages/**/*.ts"],
      exclude: [
        "apps/dashboard/src/**/*cli.ts",
        "apps/dashboard/src/cli.ts",
        "apps/mission-control/**",
        "packages/shared/src/mission-control.ts"
      ],
      thresholds: {
        lines: 60,
        branches: 60,
        functions: 75,
        statements: 60
      }
    }
  }
});
