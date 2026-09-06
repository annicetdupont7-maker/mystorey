import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({ plugins: [react()], resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src"), "server-only": path.resolve(import.meta.dirname, "./src/test/stubs/server-only.ts") } }, test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], fileParallelism: false, isolate: false, maxWorkers: 1, poolTimeout: 120000 } });