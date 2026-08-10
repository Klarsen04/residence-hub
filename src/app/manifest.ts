import type { MetadataRoute } from "next";

// PWA manifest (served at /manifest.webmanifest). Makes Residence Hub
// installable to the home screen on Android/Chrome/desktop; iOS uses the
// apple-* meta tags set in the root layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Residence Hub",
    short_name: "Residence Hub",
    description: "The digital home of your residence hall — events, roster, check-ins, and community.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf5ea", // warm ivory
    theme_color: "#33593f", // sage
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    categories: ["productivity", "education"],
  };
}
