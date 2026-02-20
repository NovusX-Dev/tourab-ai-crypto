import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/test/**/*.spec.ts"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      enabled: false,
      provider: "v8",
      include: [
        "src/logic/**/*.ts",
        "src/components/EventStream.tsx",
        "src/components/OrdersPanel.tsx",
        "src/components/PortfolioPanel.tsx",
        "src/format.ts"
      ],
      thresholds: {
        lines: 30,
        branches: 25,
        functions: 30,
        statements: 30
      }
    }
  }
});
