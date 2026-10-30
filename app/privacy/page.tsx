import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { PrivacyEn } from "./en";
import { PrivacyFr } from "./fr";

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === "fr"
    ? { title: "Politique de confidentialité · fuzzyHR", description: "Ce que fuzzyHR recueille, pourquoi, avec qui il est communiqué, et vos droits." }
    : { title: "Privacy Policy · fuzzyHR", description: "What fuzzyHR collects, why, who it's shared with, and your rights." };
}

export default async function PrivacyPage() {
  return (await getLocale()) === "fr" ? <PrivacyFr /> : <PrivacyEn />;
}
