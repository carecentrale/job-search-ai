import type { Application, Brief, Job } from "./types";
import { scoreJob } from "./score";

/** Demo data. Companies and people are fictional. Dates are relative to today so the demo never goes stale. */

export const sampleBrief: Brief = {
  name: "Alex",
  targetTitles: ["Senior Product Manager", "Group Product Manager", "Director of Product"],
  skills: ["payments", "sponsor bank", "merchant onboarding", "roadmap", "fintech", "card networks", "API"],
  locations: ["Toronto", "Montreal"],
  remoteOk: true,
  avoid: ["crypto", "commission only"],
};

const daysAgo = (n: number, today: Date) => new Date(today.getTime() - n * 86_400_000).toISOString();

type SampleJob = Omit<Job, "postedAt" | "source" | "board"> & { postedDaysAgo: number };

const jobs: SampleJob[] = [
  {
    id: "s-northwind",
    title: "Senior Product Manager, Payments",
    company: "Northwind Bank",
    location: "Toronto, ON (hybrid)",
    remote: false,
    url: "#",
    postedDaysAgo: 2,
    description:
      "Own the merchant onboarding roadmap for our acquiring business. You have 5+ years leading payments products, have worked with a sponsor bank and the card networks, and have shipped with several engineering teams at once. You will set the roadmap, work with risk and compliance on KYB, and report to the VP of Merchant Services. French is an asset.",
  },
  {
    id: "s-harbourline",
    title: "Group Product Manager, Merchant Platform",
    company: "Harbourline",
    location: "Remote, Canada",
    remote: true,
    url: "#",
    postedDaysAgo: 5,
    description:
      "Lead three product managers across our merchant platform: onboarding, payouts and the partner API. We are migrating 40,000 merchants to a new payments stack next year and need someone who has done a migration like this before and can own the roadmap end to end with fintech partners.",
  },
  {
    id: "s-ledgerly",
    title: "Director of Product, Fintech",
    company: "Ledgerly",
    location: "Montreal, QC",
    remote: false,
    url: "#",
    postedDaysAgo: 46,
    description:
      "Lead product for our small business banking suite. Experience in payments and fintech required. You will build the team, own the roadmap and work closely with our sponsor bank partner on new account and card programs for Canadian businesses across Quebec and Ontario.",
  },
  {
    id: "s-quarry",
    title: "Senior Product Manager, Growth",
    company: "Quarry Labs",
    location: "Vancouver, BC",
    remote: false,
    url: "#",
    postedDaysAgo: 3,
    description:
      "Own sign-up and activation for our design collaboration tool. You love experiments, funnels and pricing pages, and have shipped growth features for self-serve products used by millions of people. Experience with product-led growth and lifecycle email is a plus. This role is in office four days a week.",
  },
  {
    id: "s-coinward",
    title: "Senior Product Manager, Payments",
    company: "Coinward",
    location: "Remote",
    remote: true,
    url: "#",
    postedDaysAgo: 1,
    description:
      "Build the payments rails for our crypto exchange, including card funding, bank transfers and sponsor bank relationships. You will own the roadmap for deposits and withdrawals across North America and work with our compliance team on licensing.",
  },
  {
    id: "s-tillpoint",
    title: "Product Manager, Point of Sale",
    company: "Tillpoint",
    location: "Toronto, ON",
    remote: false,
    url: "#",
    postedDaysAgo: 9,
    description:
      "Own our countertop and unattended terminal products. You will work with hardware partners, certify devices with the card networks and plan the roadmap for our merchant point of sale software, from onboarding to daily settlement reporting for restaurants and retail stores across Canada.",
  },
];

export function sampleJobs(today = new Date()): Job[] {
  return jobs.map(({ postedDaysAgo, ...j }) => ({ ...j, postedAt: daysAgo(postedDaysAgo, today), source: "sample", board: "sample" }));
}

/** A tracker with a few applications already in flight. */
export function sampleApplications(today = new Date()): Application[] {
  const mk = (job: Job) => scoreJob(sampleBrief, job, today)!;
  const base = (id: string, company: string, title: string, location: string): Job => ({
    id,
    title,
    company,
    location,
    remote: false,
    url: "#",
    description:
      "Payments product role owning the roadmap for merchant onboarding with a sponsor bank and the card networks. Fintech experience required.",
    postedAt: daysAgo(30, today),
    source: "sample",
    board: "sample",
  });
  return [
    {
      id: "a-clearwater",
      job: mk(base("s-clearwater", "Clearwater Pay", "Senior Product Manager, Payments", "Toronto, ON")),
      status: "applied",
      createdAt: daysAgo(10, today),
      appliedAt: daysAgo(8, today),
    },
    {
      id: "a-maplecard",
      job: mk(base("s-maplecard", "Maple Card Co.", "Group Product Manager, Issuing", "Montreal, QC")),
      status: "interviewing",
      createdAt: daysAgo(21, today),
      appliedAt: daysAgo(18, today),
      interviewAt: daysAgo(-1, today),
      note: "Second round with the CPO.",
    },
    {
      id: "a-fernpay",
      job: mk(base("s-fernpay", "FernPay", "Director of Product", "Remote")),
      status: "applied",
      createdAt: daysAgo(4, today),
      appliedAt: daysAgo(3, today),
    },
    {
      id: "a-stoneline",
      job: mk(base("s-stoneline", "Stoneline", "Senior PM, Treasury", "Toronto, ON")),
      status: "closed",
      createdAt: daysAgo(40, today),
      appliedAt: daysAgo(38, today),
      note: "Role went to an internal candidate.",
    },
  ];
}
