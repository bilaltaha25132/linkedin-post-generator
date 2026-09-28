import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Signal Desk",
    short_name: "Signal Desk",
    description: "Monitor the wire, write posts worth reading.",
    start_url: "/",
    display: "standalone",
    background_color: "#15171b",
    theme_color: "#2c40bd",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
