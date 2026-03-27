import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { CreateAiDto, StreamingAiDto } from './dto/create-ai.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set. Please set it in your .env file.',
      );
      throw new Error(
        'GEMINI_API_KEY environment variable is required. Please set it in your .env file.',
      );
    }

    this.ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    this.logger.log('Gemini AI initialized successfully');
  }

  /**
   * Standard request: Waits for the entire response to finish.
   */
  async getSimpleResponse(createAiDto: CreateAiDto) {
    try {
      const model = createAiDto.model || 'gemini-3-flash-preview';
      const prompt = this.promtGeneratorForGemini(createAiDto.prompt);

      const response = await this.ai.models.generateContent({
        model: model,
        contents: prompt,
      });

      const content = response.text;
      if (!content) {
        throw new Error('No content received from Gemini API');
      }

      return {
        content: content,
        model: model,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching completion:', error.message);
      throw error;
    }
  }

  /**
   * Streaming request: Yields tokens as they are generated (Typewriter effect).
   */
  async *getStreamingResponse(streamingAiDto: StreamingAiDto) {
    try {
      const model = streamingAiDto.model || 'gemini-3-flash-preview';
      const prompt = this.promtGeneratorForGemini(streamingAiDto.prompt);

      const stream = await this.ai.models.generateContentStream({
        model: model,
        contents: prompt,
      });

      for await (const chunk of stream) {
        const text = chunk.text || '';
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error('Streaming Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate prompt for Gemini — optimized for detailed, step-by-step
   * informational content that satisfies Google's Helpful Content guidelines.
   */
  private promtGeneratorForGemini(prompt: string): string {
    return `
You are an experienced technical writer and subject-matter expert with 10+ years of hands-on experience.
Your job is to write a genuinely helpful, deeply detailed article that a real practitioner would bookmark, share, and return to.

TOPIC: ${prompt}

▸▸▸ WORD COUNT REQUIREMENT — READ THIS FIRST ◂◂◂
The final article MUST be between 2500 and 3000 words of body content (HTML text only, excluding tags).
This is a hard requirement. A response under 2000 words will be considered incomplete.
Each major section must be substantive — do not write thin paragraphs. Expand every point with
real examples, exact commands, specific tool names, numbers, and explanatory context.
If you find a section running short, add a "Why this works" paragraph, a comparison of alternatives,
or a real-world scenario showing the concept in action.

═══════════════════════════════════════════
CONTENT QUALITY RULES (most important)
═══════════════════════════════════════════
1. Write from first-hand knowledge. Include specific details only someone with real experience would know —
   exact settings, real error messages, "what I wish I knew" insights.
2. Every claim must be actionable and specific. Instead of "use a good password", write
   "generate a passphrase of 4+ random words using Bitwarden's built-in generator (Settings → Generator → Passphrase)".
3. Add concrete examples, sample code, real tool names, exact CLI commands, and specific numbers wherever possible.
4. Anticipate follow-up questions and answer them inline before the reader has to search elsewhere.
5. When multiple approaches exist, compare their trade-offs in a short table or bullet list so the reader can choose.
6. Mention real limitations, edge cases, and when this advice does NOT apply.
7. Each step in the guide must include: WHAT to do, WHY it matters, HOW to verify it worked, and at least one
   concrete example or code snippet.

═══════════════════════════════════════════
REQUIRED ARTICLE STRUCTURE
═══════════════════════════════════════════
Use semantic HTML only. No markdown. No emojis. All sections below are REQUIRED.

<h2>Introduction</h2>
(~200 words minimum)
- Open with the specific problem this article solves — no generic filler.
- State exactly who this guide is for and what they will have built or learned by the end.
- List 2-4 concrete prerequisites (tools, versions, assumed knowledge).
- Give a one-sentence overview of the approach you will take.

<h2>Background & Key Concepts</h2>
(~300 words minimum)
- Define every term or technology the reader needs before the steps begin.
- Explain HOW each piece fits into the bigger picture.
- If relevant, include a brief comparison table of alternatives (e.g., tool A vs tool B vs tool C).
- Keep definitions practical — tie each concept to a real outcome.

<h2>Step-by-Step Guide</h2>
(~1200 words minimum — this is the core of the article)
- Minimum 5 steps, ideally 7-9 for thorough coverage.
- Use <h3>Step 1: [Strong action verb] ...</h3> for each step.
- Each step must have:
    • An opening sentence explaining the goal of this step.
    • A detailed explanation (3-5 sentences) of what you are doing and why.
    • The exact command, code block, or UI actions required — use <pre><code> for all code.
    • A verification step ("Run X to confirm it worked" or "You should see Y in the output").
    • At least one <strong>Tip:</strong> or <strong>Warning:</strong> callout per step.
- Use <ul> or <ol> for sub-steps within a step.

<h2>Real-World Example</h2>
(~300 words minimum)
- Walk through a complete, realistic scenario from start to finish using the steps above.
- Use a named example (e.g., "Let's say you are deploying a Node.js app called 'invoicebot'...").
- Show the actual inputs, outputs, and decisions made along the way.

<h2>Common Mistakes & How to Fix Them</h2>
(~300 words minimum)
- List 4-6 real mistakes beginners and intermediate practitioners make.
- For each: describe the symptom, explain the root cause, and give the exact fix.
- Format as <h3>Mistake 1: [Description]</h3> with <p>Cause: ...</p> and <p>Fix: ...</p>.

<h2>Performance & Optimization Tips</h2>
(~200 words minimum)
- 3-5 actionable tips to get more out of what was just set up.
- Include specific settings, flags, or configurations with real values.

<h2>Summary & Next Steps</h2>
(~150 words minimum)
- Recap the 4-5 most important takeaways as a <ul> list.
- Suggest 2-3 concrete next topics the reader should explore.
- End with one sentence encouraging the reader to apply what they learned today.

═══════════════════════════════════════════
WRITING STYLE
═══════════════════════════════════════════
- Active voice. Direct sentences. No passive constructions where avoidable.
- Write as if teaching a smart but inexperienced colleague — patient, precise, never condescending.
- Zero fluff: no "In today's fast-paced world", no "it goes without saying", no "as we all know".
- Banned AI clichés: "delve", "crucial", "landscape", "navigate", "unleash", "harness", "seamlessly",
  "comprehensive guide to", "game-changer", "robust", "leverage" (as a verb).
- Vary sentence length. Short punchy lines for emphasis. Longer sentences for nuanced explanations.
- Address the reader as "you". Use "we" sparingly and only when walking through something together.
- Prefer specific numbers over vague ranges: "reduces build time by ~40%" beats "significantly faster".

═══════════════════════════════════════════
SEO RULES
═══════════════════════════════════════════
- Title: Include the primary keyword naturally. Keep under 60 characters.
- Excerpt: A compelling 150-160 character meta description that answers what the reader gets.
- Keywords: 10-14 long-tail keywords reflecting real search queries
  (e.g. "how to deploy Node.js on AWS EC2 with Nginx" not just "Node.js deployment").
- Generate valid JSON-LD ArticleSchema and FAQPageSchema.
- FAQs: 6-8 genuine questions a reader would ask AFTER reading — not paraphrases of section headings.
  Each FAQ answer should be 2-4 sentences and add information not already in the body.

═══════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════
Return ONLY valid JSON (no extra text, no markdown fences):

{
  "metadata": {
    "title": "string (under 60 chars)",
    "slug": "url-friendly-slug",
    "excerpt": "string (150-160 chars)",
    "author": "ME",
    "publishedAt": "ISO 8601 date",
    "readingTime": "X min read",
    "keywords": ["long-tail keyword 1", "..."],
    "ogTitle": "string",
    "ogDescription": "string"
  },
  "content": {
    "html": "<h2>...</h2><p>...</p>..."
  },
  "seo_technical": {
    "articleSchema": { valid JSON-LD Article },
    "faqSchema": { valid JSON-LD FAQPage }
  },
  "faqs": [
    { "question": "string", "answer": "string" }
  ]
}

CRITICAL:
- The JSON must be valid and parseable. Escape all quotes inside HTML strings with \\".
- Do NOT wrap the response in markdown code fences.
- Do NOT add any text before or after the JSON object.
- Do NOT invent statistics, benchmarks, or cite sources that do not exist.
- The html field must contain the FULL article body — all sections listed above, fully written out.
  A short or truncated html value is a failure. The reader must be able to act on this article alone.
`;
  }

  // Legacy methods (kept for backward compatibility)
  create(createAiDto: CreateAiDto) {
    return this.getSimpleResponse(createAiDto);
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: any) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
