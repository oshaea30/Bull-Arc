import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
      define: {
        global: "globalThis",
      },
    },
    include: [
      "buffer",
      "crypto-browserify",
      "readable-stream",
      "util",
      "browserify-sign",
      "process",
      "events",
      "@bundlr-network/client",
    ],
  },
  define: {
    "process.env": {},
    global: "globalThis",
    "global.TYPED_ARRAY_SUPPORT": true,
  },
  resolve: {
    alias: {
      buffer: "buffer",
      crypto: "crypto-browserify",
      stream: "readable-stream",
      util: "util",
      process: "process/browser",
      zlib: "browserify-zlib",
      assert: "assert",
      http: "stream-http",
      https: "https-browserify",
      os: "os-browserify/browser",
      url: "url",
      "stream-browserify": "readable-stream",
      _stream_readable: "readable-stream/readable",
      _stream_writable: "readable-stream/writable",
      _stream_duplex: "readable-stream/duplex",
      _stream_transform: "readable-stream/transform",
      _stream_passthrough: "readable-stream/passthrough",
    },
  },
});
