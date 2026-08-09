import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Residence Hub — This is a place. People live here.",
  description:
    "The digital home of your residence hall. Move through the floors, the faces and the everyday life of the community.",
};

export default function Home() {
  // Lenis smooth-scroll lives here (landing only) — its scroll animations need
  // it, and scoping it here keeps it off the app pages where it broke scrolling.
  return (
    <SmoothScroll>
      <LandingExperience />
    </SmoothScroll>
  );
}
