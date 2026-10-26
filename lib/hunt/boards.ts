import type { BoardRef } from "./sources";

/**
 * Starter list of public company job boards, checked live on 2026-10-26.
 * Every seeker's daily hunt covers these plus any companies they add to their brief.
 * Add a company by finding its slug on boards.greenhouse.io/<slug> or jobs.lever.co/<slug>.
 */
export const STARTER_BOARDS: BoardRef[] = [
  { source: "greenhouse", board: "stripe", company: "Stripe" },
  { source: "greenhouse", board: "affirm", company: "Affirm" },
  { source: "greenhouse", board: "brex", company: "Brex" },
  { source: "greenhouse", board: "robinhood", company: "Robinhood" },
  { source: "greenhouse", board: "mercury", company: "Mercury" },
  { source: "greenhouse", board: "chime", company: "Chime" },
  { source: "greenhouse", board: "faire", company: "Faire" },
  { source: "greenhouse", board: "sofi", company: "SoFi" },
  { source: "greenhouse", board: "hootsuite", company: "Hootsuite" },
  { source: "lever", board: "versapay", company: "Versapay" },
  { source: "lever", board: "spotify", company: "Spotify" },
  { source: "lever", board: "palantir", company: "Palantir" },
];
