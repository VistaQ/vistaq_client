import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: parseInt(env.PORT) || 3000,
      host: "0.0.0.0",
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./tests/setup.ts"],
      // Override VITE_API_URL so apiClient uses relative '/api' paths that MSW can intercept.
      // Without this, the staging URL from .env is used and MSW misses all requests.
      env: {
        VITE_API_URL: "",
        VITE_TENANT_SLUG: "test-tenant",
      },
    },
  };
});
