import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PawStay: trusted pet care",
    short_name: "PawStay",
    description: "Leave your pet with verified caretakers while you travel. Pay safely through the platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf5ed",
    theme_color: "#c2570c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
