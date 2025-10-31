import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.wasm"],
  build: {
    rollupOptions: {
      external: ["expo-sqlite/web/worker"],
    },
  },
});
