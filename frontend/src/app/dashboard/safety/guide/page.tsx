import { Metadata } from "next";
import { GuideClient } from "./GuideClient";

export const metadata: Metadata = {
  title: "Panduan Pelaporan Insiden | ACMS",
  description: "Panduan resmi untuk melaporkan insiden keselamatan dan akademik",
};

export default function GuidePage() {
  return <GuideClient />;
}
