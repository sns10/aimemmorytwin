// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (publishable) backend config. Safe to ship in the client bundle.
// Kept here as a build-time fallback so the browser client still boots when
// the build environment has no .env file (it is gitignored).
const SUPABASE_URL = "https://xzfrmplowmepzikhaxfo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6ZnJtcGxvd21lcHppa2hheGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MDUzNzcsImV4cCI6MjA5OTk4MTM3N30.E5qBgD-fIibKsMtWVjdnalBvSacTDspOxNxLXz19-Bo";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
        process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || SUPABASE_URL,
      ),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          SUPABASE_PUBLISHABLE_KEY,
      ),
    },
  },
});
