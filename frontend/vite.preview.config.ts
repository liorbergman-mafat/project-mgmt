// TEMPORARY preview harness — not part of the app.
// Serves the real UI with a static location list so the Settings page can be
// reviewed without a backend or Supabase. Delete this file, preview-mock-api.ts
// and preview-locations.json when you are done looking.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const mock = path.resolve(__dirname, "preview-mock-api.ts");

export default defineConfig({
  plugins: [
    {
      name: "preview-mock-api",
      enforce: "pre",
      resolveId(source) {
        return source === "../api" || source === "./api" ? mock : null;
      },
    },
    react(),
  ],
  server: { port: 5199, open: false },
});
