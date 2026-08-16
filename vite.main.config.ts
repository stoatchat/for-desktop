import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    commonjsOptions: {
      include: [/node-pipewire/, /node_modules/],
    },
    rollupOptions: {
      external: ["node-pipewire"],
    },
  },
});
