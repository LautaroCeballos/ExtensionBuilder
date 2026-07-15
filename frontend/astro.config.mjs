import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind()],
  output: "static",
  site: "https://lautaroceballos.github.io",
  base: "/ExtensionBuilder",
  server: {
    port: 3000,
  },
});
