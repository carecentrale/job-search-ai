import type { Metadata } from "next";
import { getLocale } from "@/lib/locale";
import { TermsEn } from "./en";
import { TermsFr } from "./fr";

export async function generateMetadata(): Promise<Metadata> {
  return (await getLocale()) === "fr"
    ? { title: "Conditions d'utilisation · fuzzyHR", description: "Les règles d'utilisation de fuzzyHR, le chasseur de têtes personnel propulsé par l'IA." }
    : { title: "Terms of Use · fuzzyHR", description: "The rules for using fuzzyHR, the AI personal headhunter." };
}

export default async function TermsPage() {
  return (await getLocale()) === "fr" ? <TermsFr /> : <TermsEn />;
}
