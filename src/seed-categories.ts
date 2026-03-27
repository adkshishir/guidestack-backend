/**
 * SEO-Optimized Niche Category & Tag Seed Data
 *
 * Strategy: Focus on high-search-volume, evergreen "how-to" and informational
 * content niches. Each category targets a content cluster that Google rewards
 * with topical authority when you publish deep, step-by-step guides.
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
    name: 'Software Development',
    slug: 'software-development',
    description:
      'Step-by-step tutorials, best practices, and deep dives into modern software engineering.',
    children: [
      {
        name: 'Web Development',
        slug: 'web-development',
        description:
          'Frontend and backend web development tutorials with practical code examples.',
        tags: [
          'React',
          'Next.js',
          'Node.js',
          'TypeScript',
          'CSS',
          'HTML',
          'JavaScript',
          'REST API',
          'GraphQL',
        ],
      },
      {
        name: 'Mobile App Development',
        slug: 'mobile-app-development',
        description:
          'Build mobile apps from scratch with step-by-step guides for iOS and Android.',
        tags: [
          'React Native',
          'Flutter',
          'Swift',
          'Kotlin',
          'Mobile UI',
          'App Store',
        ],
      },
      {
        name: 'DevOps & Cloud',
        slug: 'devops-cloud',
        description:
          'CI/CD pipelines, cloud infrastructure, containerization, and deployment guides.',
        tags: [
          'Docker',
          'Kubernetes',
          'AWS',
          'CI/CD',
          'Linux',
          'Terraform',
          'GitHub Actions',
        ],
      },
      {
        name: 'Database & Backend',
        slug: 'database-backend',
        description:
          'Database design, optimization, and backend architecture tutorials.',
        tags: [
          'PostgreSQL',
          'MongoDB',
          'Redis',
          'SQL',
          'Database Design',
          'Microservices',
        ],
      },
    ],
  },
  {
    name: 'Artificial Intelligence',
    slug: 'artificial-intelligence',
    description:
      'Practical AI guides — from machine learning fundamentals to building production AI systems.',
    children: [
      {
        name: 'Machine Learning',
        slug: 'machine-learning',
        description:
          'Learn machine learning concepts and build models with step-by-step tutorials.',
        tags: [
          'Python',
          'TensorFlow',
          'PyTorch',
          'Scikit-learn',
          'Neural Networks',
          'Data Science',
        ],
      },
      {
        name: 'AI Tools & Automation',
        slug: 'ai-tools-automation',
        description:
          'How to use AI tools to automate tasks, boost productivity, and build smarter workflows.',
        tags: [
          'ChatGPT',
          'Claude',
          'AI Automation',
          'Prompt Engineering',
          'AI Agents',
          'LLM',
        ],
      },
      {
        name: 'Computer Vision',
        slug: 'computer-vision',
        description:
          'Image recognition, object detection, and visual AI implementation guides.',
        tags: [
          'OpenCV',
          'Image Processing',
          'Object Detection',
          'OCR',
          'Deep Learning',
        ],
      },
      {
        name: 'Natural Language Processing',
        slug: 'natural-language-processing',
        description:
          'Text analysis, chatbots, sentiment analysis, and NLP application tutorials.',
        tags: [
          'NLP',
          'Text Mining',
          'Sentiment Analysis',
          'Chatbot Development',
          'Transformers',
        ],
      },
    ],
  },
  {
    name: 'Cybersecurity',
    slug: 'cybersecurity',
    description:
      'Protect your systems, data, and privacy with actionable security guides.',
    children: [
      {
        name: 'Network Security',
        slug: 'network-security',
        description:
          'Firewalls, VPNs, intrusion detection, and network hardening step-by-step guides.',
        tags: [
          'Firewall',
          'VPN',
          'Network Monitoring',
          'Penetration Testing',
          'Zero Trust',
        ],
      },
      {
        name: 'Application Security',
        slug: 'application-security',
        description:
          'Secure coding practices, vulnerability prevention, and security testing tutorials.',
        tags: [
          'OWASP',
          'Secure Coding',
          'Authentication',
          'Encryption',
          'API Security',
        ],
      },
      {
        name: 'Privacy & Data Protection',
        slug: 'privacy-data-protection',
        description:
          'Data privacy best practices, compliance guides, and personal security tips.',
        tags: [
          'GDPR',
          'Data Privacy',
          'Password Management',
          'Two-Factor Auth',
          'Data Breach',
        ],
      },
    ],
  },
  {
    name: 'Personal Finance',
    slug: 'personal-finance',
    description:
      'Actionable financial guides to build wealth, manage money, and invest smartly.',
    children: [
      {
        name: 'Investing',
        slug: 'investing',
        description:
          'Stock market, ETFs, crypto, and investment strategy guides for beginners to advanced.',
        tags: [
          'Stock Market',
          'ETF',
          'Index Funds',
          'Cryptocurrency',
          'Portfolio Management',
          'Dividends',
        ],
      },
      {
        name: 'Budgeting & Saving',
        slug: 'budgeting-saving',
        description:
          'Practical budgeting methods, saving strategies, and financial planning tutorials.',
        tags: [
          'Budget Planning',
          'Emergency Fund',
          'Debt Management',
          'Frugal Living',
          'Financial Goals',
        ],
      },
      {
        name: 'Side Income & Freelancing',
        slug: 'side-income-freelancing',
        description:
          'How to earn extra income through freelancing, side projects, and online businesses.',
        tags: [
          'Freelancing',
          'Passive Income',
          'Side Hustle',
          'Remote Work',
          'Online Business',
        ],
      },
    ],
  },
  {
    name: 'Productivity & Tools',
    slug: 'productivity-tools',
    description:
      'Master your workflow with guides on tools, systems, and productivity frameworks.',
    children: [
      {
        name: 'Developer Tools',
        slug: 'developer-tools',
        description:
          'IDE setup, CLI tools, debugging, and developer environment optimization guides.',
        tags: [
          'VS Code',
          'Git',
          'Terminal',
          'Debugging',
          'Code Editor',
          'Chrome DevTools',
        ],
      },
      {
        name: 'Workflow Automation',
        slug: 'workflow-automation',
        description:
          'Automate repetitive tasks with scripts, tools, and integration platforms.',
        tags: [
          'Zapier',
          'Make',
          'Shell Scripts',
          'Cron Jobs',
          'Task Automation',
          'No-Code',
        ],
      },
      {
        name: 'Project Management',
        slug: 'project-management',
        description:
          'Agile, Scrum, Kanban, and project management methodologies explained step by step.',
        tags: [
          'Agile',
          'Scrum',
          'Kanban',
          'Jira',
          'Team Collaboration',
          'Sprint Planning',
        ],
      },
    ],
  },
  {
    name: 'Career & Growth',
    slug: 'career-growth',
    description:
      'Level up your tech career with interview prep, skill building, and career strategy guides.',
    children: [
      {
        name: 'Interview Preparation',
        slug: 'interview-preparation',
        description:
          'Coding interview prep, system design, behavioral questions, and resume tips.',
        tags: [
          'Coding Interview',
          'System Design',
          'Data Structures',
          'Algorithms',
          'Resume',
          'LeetCode',
        ],
      },
      {
        name: 'Skill Development',
        slug: 'skill-development',
        description:
          'Learning paths, certifications, and skill-building strategies for tech professionals.',
        tags: [
          'Online Courses',
          'Certifications',
          'Learning Path',
          'Tech Skills',
          'Self-Learning',
        ],
      },
      {
        name: 'Tech Industry Insights',
        slug: 'tech-industry-insights',
        description:
          'Salary guides, job market trends, and career advice for the tech industry.',
        tags: [
          'Tech Salary',
          'Job Market',
          'Remote Work',
          'Startup',
          'Tech Trends',
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
