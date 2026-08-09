import type { Metadata } from "next";
import { LandingExperience } from "@/components/landing/LandingExperience";

export const metadata: Metadata = {
  title: "Residence Hub — This is a place. People live here.",
  description:
    "The digital home of your residence hall. Move through the floors, the faces and the everyday life of the community.",
};

export default function Home() {
  return <LandingExperience />;
}
