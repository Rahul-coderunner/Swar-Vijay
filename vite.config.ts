import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    allowedHosts: true,
    cors: true,
    host: "0.0.0.0",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      allowedHosts: true,
      cors: true,
      host: "0.0.0.0",
    },
  },
});
