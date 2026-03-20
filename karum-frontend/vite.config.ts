import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Replace relative OG image paths with absolute URLs at build time */
function ogAbsoluteUrls(): Plugin {
  return {
    name: "og-absolute-urls",
    transformIndexHtml(html) {
      const siteUrl = (process.env.VITE_SITE_URL || "").replace(/\/$/, "");
      if (!siteUrl) return html;
      return html.replace(/content="\/og-image\.png"/g, `content="${siteUrl}/og-image.png"`);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ogAbsoluteUrls()],
  server: {
    host: "0.0.0.0",
  },
});
