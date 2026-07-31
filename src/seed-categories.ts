/**
 * SEO-Optimized Robo-Advisor Category & Tag Seed Data
 *
 * Strategy: WealthAlgor covers one vertical — automated/robo investing —
 * across four content pillars, each with three sub-niches sized to rank
 * against long-tail, low-competition queries the major finance-media
 * incumbents (NerdWallet, Forbes Advisor, Bankrate, SmartAsset) leave thin:
 * interactive tools, mechanics explainers, and persona/behavioral angles
 * rather than another "best robo-advisor" listicle.
 *
 * Scope: primarily US robo-advisor platforms, with UK/Canada/Australia
 * platforms woven into the same sub-niches (not forked into separate
 * country categories) since those are the other markets where robo-advisors
 * and their affiliate programs actually exist.
 *
 * Usage: Import SEED_CATEGORIES and getAllSeedTags() in your bootstrap or
 * a dedicated seeder service to populate the database.
 */

export interface SeedSubCategory {
  name: string;
  slug: string;
  description: string;
  tags: string[];
}

export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  children: SeedSubCategory[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Robo-Advisor Comparisons',
    slug: 'robo-advisor-comparisons',
    description:
      'Head-to-head robo-advisor comparisons, persona-fit picks, and true fee breakdowns across the platforms that matter in 2026.',
    children: [
      {
        name: 'Head-to-Head Match-ups',
        slug: 'head-to-head-matchups',
        description:
          'Exhaustive single-pair robo-advisor breakdowns — the "X vs Y" decisions the big roundup sites cover in a single paragraph.',
        tags: [
          'Betterment',
          'Wealthfront',
          'M1 Finance',
          'Schwab Intelligent Portfolios',
          'Vanguard Digital Advisor',
          'Fidelity Go',
          'Wealthsimple',
          'Nutmeg',
        ],
      },
      {
        name: 'Persona Fit',
        slug: 'persona-fit',
        description:
          '"Best for X" robo-advisor guides for beginners, retirees, the self-employed, small balances, and high-net-worth investors.',
        tags: [
          'Robo-Advisor for Beginners',
          'Robo-Advisor for Retirees',
          'Small Balance Investing',
          'Self-Employed Investing',
          'High Net Worth Robo-Advisors',
        ],
      },
      {
        name: 'Fees & Fine Print',
        slug: 'fees-and-fine-print',
        description:
          'The real dollar impact of management fees, account minimums, and the costs that only show up after you sign up.',
        tags: [
          'Management Fees',
          'AUM Fees',
          'Account Minimums',
          'Hidden Costs',
          'Fee Comparison',
          'Expense Ratios',
        ],
      },
    ],
  },
  {
    name: 'Automated Investing Mechanics',
    slug: 'automated-investing-mechanics',
    description:
      'The math behind robo-advisor portfolios — tax-loss harvesting, rebalancing algorithms, and retirement drawdown planning explained in plain language.',
    children: [
      {
        name: 'Tax-Loss Harvesting',
        slug: 'tax-loss-harvesting',
        description:
          'How automated tax-loss harvesting actually works — wash-sale rules, direct indexing, and what it is worth to you.',
        tags: [
          'Tax-Loss Harvesting',
          'Direct Indexing',
          'Wash Sale Rule',
          'Tax Alpha',
          'Capital Gains Tax',
        ],
      },
      {
        name: 'Portfolio Construction & Rebalancing',
        slug: 'portfolio-rebalancing',
        description:
          'How robo-advisors set your allocation and decide when to trade — threshold-based vs. calendar-based rebalancing.',
        tags: [
          'Asset Allocation',
          'Rebalancing Threshold',
          'Modern Portfolio Theory',
          'Risk Tolerance',
          'ETF Portfolios',
        ],
      },
      {
        name: 'Goal-Based & Retirement Drawdown',
        slug: 'retirement-drawdown',
        description:
          'Planning the decumulation phase — safe withdrawal rates and drawdown strategy for a robo-managed retirement account.',
        tags: [
          'Retirement Planning',
          'Drawdown Strategy',
          'Safe Withdrawal Rate',
          'Goal-Based Investing',
          'Decumulation',
        ],
      },
    ],
  },
  {
    name: 'Alternatives & Hybrid Models',
    slug: 'alternatives-and-hybrid-models',
    description:
      "When a pure robo-advisor isn't the right fit — hybrid human-plus-algorithm services, ESG portfolios, and honest DIY-vs-robo comparisons.",
    children: [
      {
        name: 'Hybrid Robo + Human Advisors',
        slug: 'hybrid-robo-human-advisors',
        description:
          'Services that blend an algorithm with on-demand access to a certified financial planner, and what that access actually costs.',
        tags: [
          'Hybrid Advisor',
          'SigFig',
          'Vanguard Personal Advisor',
          'SoFi Invest',
          'Certified Financial Planner',
          'AUM Advisory Fee',
        ],
      },
      {
        name: 'ESG & Values-Based Investing',
        slug: 'esg-values-based-investing',
        description:
          'What robo-advisor ESG and sustainable portfolios actually hold, beyond the marketing label.',
        tags: [
          'ESG Investing',
          'Sustainable Portfolios',
          'Ellevest',
          'Socially Responsible Investing',
          'Impact Investing',
        ],
      },
      {
        name: 'DIY Index Investing vs Robo',
        slug: 'diy-vs-robo-investing',
        description:
          'The "just buy the index fund yourself" debate — an honest look at when DIY beats automation and when it does not.',
        tags: [
          'Index Funds',
          'DIY Investing',
          'Bogleheads',
          'Three-Fund Portfolio',
          'Robo-Advisor Alternatives',
        ],
      },
    ],
  },
  {
    name: 'Automated Money Habits',
    slug: 'automated-money-habits',
    description:
      'The behavioral side of automated investing — spare-change round-ups, dollar-cost averaging, and what first-time investors actually need to know.',
    children: [
      {
        name: 'Round-Up & Spare-Change Investing',
        slug: 'round-up-investing',
        description:
          'Does spare-change investing actually build wealth, or is it a gimmick? A realistic look at round-up mechanics.',
        tags: [
          'Round-Up Investing',
          'Acorns',
          'Spare Change Investing',
          'Micro-Investing',
        ],
      },
      {
        name: 'Dollar-Cost Averaging Automation',
        slug: 'dollar-cost-averaging',
        description:
          'Turning off manual buy/sell decisions with recurring auto-deposits, and how that compares to investing a lump sum.',
        tags: [
          'Dollar-Cost Averaging',
          'Automatic Investing',
          'Recurring Deposits',
          'Lump Sum vs DCA',
        ],
      },
      {
        name: 'First-Time Investor Onboarding',
        slug: 'first-time-investor-onboarding',
        description:
          'The real anxieties of handing money to an algorithm for the first time — safety, insurance, and what happens if the market drops.',
        tags: [
          'Investing for Beginners',
          'SIPC Insurance',
          'Risk Tolerance Quiz',
          'Is Investing Safe',
        ],
      },
    ],
  },
];

/**
 * Flatten all unique tags from the seed data
 */
export function getAllSeedTags(): {
  name: string;
  slug: string;
  description: string;
}[] {
  const tagMap = new Map<string, string>();

  for (const category of SEED_CATEGORIES) {
    for (const child of category.children) {
      for (const tag of child.tags) {
        if (!tagMap.has(tag)) {
          const slug = tag
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
          tagMap.set(tag, slug);
        }
      }
    }
  }

  return Array.from(tagMap.entries()).map(([name, slug]) => ({
    name,
    slug,
    description: `Articles and tutorials related to ${name}`,
  }));
}
