/**
 * What's new, in plain language, for the public "What's new" page.
 * Newest first. Each release also gets a git tag (v0.7.0 …) on its last commit,
 * and package.json carries the current version. See VERSIONING.md.
 */

export type Release = {
  version: string;
  /** ISO date of the release. */
  date: string;
  en: { title: string; items: string[] };
  fr: { title: string; items: string[] };
};

export const RELEASES: Release[] = [
  {
    version: "0.7.0",
    date: "2026-10-30",
    en: {
      title: "Version numbers and a What's new page",
      items: [
        "This page: a plain-language list of what changed in each version.",
        "The version you're using now shows at the bottom of every page.",
      ],
    },
    fr: {
      title: "Numéros de version et page Nouveautés",
      items: [
        "Cette page : la liste, en langage clair, de ce qui a changé dans chaque version.",
        "La version que vous utilisez s'affiche maintenant au bas de chaque page.",
      ],
    },
  },
  {
    version: "0.6.0",
    date: "2026-10-30",
    en: {
      title: "fuzzyHR en français",
      items: [
        "The whole site is now available in French, including the Privacy Policy and Terms. Visitors in Quebec see French first, and an EN | FR switch is on every page.",
        "The AI writes its job reviews in your language.",
        "New FAQ: can you deduct fuzzyHR from your taxes in Canada, Quebec or the US, with official sources.",
        "Fixed buttons and tabs that were cut off on phones.",
      ],
    },
    fr: {
      title: "fuzzyHR en français",
      items: [
        "Tout le site est maintenant offert en français, y compris la politique de confidentialité et les conditions d'utilisation. Au Québec, le français s'affiche d'abord, et un sélecteur EN | FR se trouve sur chaque page.",
        "L'IA rédige ses analyses d'offres dans votre langue.",
        "Nouvelle question fréquente : peut-on déduire fuzzyHR de ses impôts au Canada, au Québec ou aux États-Unis, avec des sources officielles.",
        "Correction des boutons et des onglets coupés sur les téléphones.",
      ],
    },
  },
  {
    version: "0.5.0",
    date: "2026-10-28",
    en: {
      title: "Take a break, or tell us you got the job",
      items: [
        "Pause your search for 1 to 3 months, or until you come back. Hunting and reminders stop, and Personal billing pauses.",
        "Got a job? Tell us in one click: everything stops right away and you're not charged again.",
        "The Personal plan's price is always shown, in Canadian dollars in Canada and US dollars in the US.",
      ],
    },
    fr: {
      title: "Faites une pause, ou dites-nous que vous avez décroché l'emploi",
      items: [
        "Mettez votre recherche en pause pour 1 à 3 mois, ou jusqu'à votre retour. La recherche et les rappels s'arrêtent, et la facturation du forfait Personnel est suspendue.",
        "Vous avez décroché un emploi? Dites-le-nous en un clic : tout s'arrête immédiatement et vous n'êtes plus facturé.",
        "Le prix du forfait Personnel est toujours affiché, en dollars canadiens au Canada et en dollars américains aux États-Unis.",
      ],
    },
  },
  {
    version: "0.4.0",
    date: "2026-10-27",
    en: {
      title: "The Personal plan",
      items: [
        "A monthly plan for people who'd rather not deal with API keys: the AI is included, with a set number of tailored applications each month.",
        "Secure payment by Stripe, and you can cancel any time from your Plan page.",
        "If free AI writing isn't switched on yet, you can ask to be notified, and you'll get a full free week when it is.",
      ],
    },
    fr: {
      title: "Le forfait Personnel",
      items: [
        "Un forfait mensuel pour ceux qui préfèrent ne pas gérer de clé d'API : l'IA est incluse, avec un nombre fixe de candidatures adaptées par mois.",
        "Paiement sécurisé par Stripe, et annulation en tout temps à partir de votre page Forfait.",
        "Si la rédaction IA gratuite n'est pas encore activée, vous pouvez demander à être averti, et vous aurez droit à une semaine gratuite complète à son activation.",
      ],
    },
  },
  {
    version: "0.3.0",
    date: "2026-10-27",
    en: {
      title: "A much bigger hunt, and AI recommendations",
      items: [
        "Every morning, fuzzyHR checks the job boards of 115 companies.",
        "The AI reads your best matches against your CV and recommends the ones worth your time. You approve or pass.",
        "Autopilot (optional): approves strong matches and writes the CV and cover letter for you. It never sends anything.",
        "Follow any company by pasting its careers page, or add a job you found by pasting its link.",
        "Privacy Policy and Terms of Use, plus Download my data and Delete my account.",
      ],
    },
    fr: {
      title: "Une recherche bien plus vaste, et des recommandations de l'IA",
      items: [
        "Chaque matin, fuzzyHR consulte les sites d'emploi de 115 entreprises.",
        "L'IA lit vos meilleures offres par rapport à votre CV et recommande celles qui valent votre temps. Vous approuvez ou écartez.",
        "Pilote automatique (facultatif) : approuve les meilleures offres et rédige le CV et la lettre de présentation pour vous. Il n'envoie jamais rien.",
        "Suivez une entreprise en collant sa page carrières, ou ajoutez une offre trouvée en collant son lien.",
        "Politique de confidentialité et conditions d'utilisation, plus Télécharger mes données et Supprimer mon compte.",
      ],
    },
  },
  {
    version: "0.2.0",
    date: "2026-10-27",
    en: {
      title: "Accounts, and the AI writes your applications",
      items: [
        "Sign up and your workspace is saved: your CV, brief, shortlist and tracker.",
        "The AI writes a tailored CV and cover letter for each role you approve, using only what's in your CV, in three templates you can save as PDF.",
        "Bring your own Claude or OpenAI key and fuzzyHR is free, with no limits. Or start with a free week on us.",
      ],
    },
    fr: {
      title: "Des comptes, et l'IA rédige vos candidatures",
      items: [
        "Inscrivez-vous et votre espace est sauvegardé : votre CV, votre mandat, votre présélection et votre suivi.",
        "L'IA rédige un CV et une lettre de présentation adaptés à chaque poste que vous approuvez, uniquement à partir de votre CV, dans trois modèles à enregistrer en PDF.",
        "Apportez votre propre clé Claude ou OpenAI et fuzzyHR est gratuit, sans limites. Ou commencez par une semaine gratuite à nos frais.",
      ],
    },
  },
  {
    version: "0.1.0",
    date: "2026-10-26",
    en: {
      title: "First preview",
      items: [
        "The fuzzyHR website and a demo you can try without signing up.",
        "The morning hunt: new postings scored against your brief, with a reason for each pick.",
        "A tracker that reminds you when to follow up.",
      ],
    },
    fr: {
      title: "Premier aperçu",
      items: [
        "Le site de fuzzyHR et une démo à essayer sans inscription.",
        "La recherche matinale : les nouvelles offres notées selon votre mandat, avec une raison pour chaque choix.",
        "Un suivi qui vous rappelle quand relancer.",
      ],
    },
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
