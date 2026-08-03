import { defineConfig } from "vite";
import nativePlugin from "vite-plugin-native-modules";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [nativePlugin()],
  build: {
    commonjsOptions: {
      include: [/node-pipewire/, /node_modules/],
    },
    rollupOptions: {
      external: ["node-pipewire"],
    },
  },
});
