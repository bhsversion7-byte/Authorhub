import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    // The remaining large asset is the async 3D engine for the landing book.
    // Keep the warning threshold above that vendor chunk while the app shell
    // stays split into small route-level bundles.
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@react-three") || id.includes("three")) return "three-vendor";
          if (id.includes("/d3") || id.includes("\\d3")) return "d3-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "rich-text-vendor";
          if (id.includes("@xyflow/react") || id.includes("@dagrejs/dagre")) return "mind-map-vendor";
          if (/[/\\]node_modules[/\\](react|react-dom|scheduler)[/\\]/.test(id)) return "react-vendor";
          return undefined;
        },
      },
    },
  },
});
