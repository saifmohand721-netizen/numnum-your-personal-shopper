// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  vite: {
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          navigateFallbackDenylist: [/^\/auth\/callback/],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "numnum-pages", networkTimeoutSeconds: 4 },
            },
            {
              urlPattern: ({ request, url }) =>
                url.origin === self.location.origin &&
                ["script", "style", "font", "image"].includes(request.destination),
              handler: "CacheFirst",
              options: { cacheName: "numnum-assets" },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Self-hosted Cloudflare deploy: keep variables set in the Worker dashboard.
  // Without keep_vars, every `wrangler deploy` wipes plain-text dashboard variables.
  nitro: {
    cloudflare: {
      wrangler: { name: "numnum-your-personal-shopper", keep_vars: true },
    },
  },
});
