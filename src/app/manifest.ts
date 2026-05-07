import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Outfit Assistant",
    short_name: "AI Outfit",
    description:
      "Get AI outfit suggestions from the clothes you already own, with wardrobe memory and virtual try-on support.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fffaf5",
    theme_color: "#1a1a2e",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
