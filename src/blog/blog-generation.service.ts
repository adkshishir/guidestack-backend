import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { BlogPost, BlogPostStatus } from './entities/blog-post.entity';
import { BlogContent, BlogContentSource } from './entities/blog-content.entity';
import { BlogSeo, Robots } from './entities/blog-seo.entity';
import { BlogSchema } from './entities/blog-schema.entity';
import { BlogFaq } from './entities/blog-faq.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { BlogCategory } from '../taxonomy/entities/blog-category.entity';
import { BlogTag } from '../taxonomy/entities/blog-tag.entity';
import { In } from 'typeorm';
import { ImageGenerationService } from '../media/image-generation.service';

interface BlogPackage {
  metadata: {
    title: string;
    slug: string;
    excerpt: string;
    author: string;
    publishedAt: string;
    readingTime: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
  };
  content: {
    html: string;
  };
  seo_technical: {
    articleSchema: Record<string, any>;
    faqSchema: Record<string, any>;
  };
  faqs: {
    question: string;
    answer: string;
  }[];
}

@Injectable()
export class BlogGenerationService {
  private readonly logger = new Logger(BlogGenerationService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly imageGenerationService: ImageGenerationService,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogContent)
    private blogContentRepository: Repository<BlogContent>,
    @InjectRepository(BlogSeo)
    private blogSeoRepository: Repository<BlogSeo>,
    @InjectRepository(BlogSchema)
    private blogSchemaRepository: Repository<BlogSchema>,
    @InjectRepository(BlogFaq)
    private blogFaqRepository: Repository<BlogFaq>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepository: Repository<BlogCategory>,
    @InjectRepository(BlogTag)
    private blogTagRepository: Repository<BlogTag>,
  ) {}

  /**
   * Generate a blog post using AI and save it to the database
   */
  async generateAndSaveBlog(
    topic?: string,
    categoryIds?: number[],
    tagIds?: number[],
  ): Promise<BlogPost> {
    try {
      this.logger.log('Starting automatic blog generation...');

      // Get default author (first admin or editor, or first user)
      const author = await this.getDefaultAuthor();
      if (!author) {
        throw new NotFoundException(
          'No author found. Please create at least one user in the system.',
        );
      }

      // Get category and tag information for prompt enhancement
      let categoryNames: string[] = [];
      let tagNames: string[] = [];
      
      if (categoryIds && categoryIds.length > 0) {
        const categories = await this.categoryRepository.find({
          where: { id: In(categoryIds) },
        });
        categoryNames = categories.map((cat) => cat.name);
        this.logger.log(`Categories for blog: ${categoryNames.join(', ')}`);
      }

      if (tagIds && tagIds.length > 0) {
        const tags = await this.tagRepository.find({
          where: { id: In(tagIds) },
        });
        tagNames = tags.map((tag) => tag.name);
        this.logger.log(`Tags for blog: ${tagNames.join(', ')}`);
      }

      // Generate blog content using AI with enhanced prompt
      const baseTopic = topic || this.generateRandomTopic();
      const enhancedPrompt = this.buildEnhancedPrompt(
        baseTopic,
        categoryNames,
        tagNames,
      );
      this.logger.log(`Generating blog for topic: ${baseTopic}`);

      const aiResponse = await this.aiService.getSimpleResponse({
        prompt: enhancedPrompt,
        model: this.configService.get<string>(
          'BLOG_GENERATION_MODEL',
          'google/gemini-2.0-flash-exp:free', // Best Gemini model for blog content
        ),
      });

      // Parse the AI response
      const blogPackage = this.parseAiResponse(aiResponse.content || '');

      // Check if slug already exists
      const existingPost = await this.blogPostRepository.findOne({
        where: { slug: blogPackage.metadata.slug },
      });
      if (existingPost) {
        // Append timestamp to slug if it exists
        blogPackage.metadata.slug = `${blogPackage.metadata.slug}-${Date.now()}`;
      }

      // Create blog post
      const blogPost = this.blogPostRepository.create({
        title: blogPackage.metadata.title,
        slug: blogPackage.metadata.slug,
        excerpt: blogPackage.metadata.excerpt,
        status: BlogPostStatus.PUBLISHED,
        authorId: author.id,
        language: 'en',
        publishedAt: new Date(),
        readingTime: this.parseReadingTime(blogPackage.metadata.readingTime),
      });

      const savedPost = await this.blogPostRepository.save(blogPost);
      this.logger.log(`Blog post created with ID: ${savedPost.id}`);

      // Create blog content
      const wordCount = this.calculateWordCount(blogPackage.content.html);
      const blogContent = this.blogContentRepository.create({
        blogPostId: savedPost.id,
        htmlContent: blogPackage.content.html,
        wordCount,
        source: BlogContentSource.AI,
      });
      await this.blogContentRepository.save(blogContent);
      this.logger.log('Blog content saved');

      // Build meta keywords: use AI keywords or derive from title/excerpt
      const keywordsArray =
        blogPackage.metadata.keywords && Array.isArray(blogPackage.metadata.keywords) && blogPackage.metadata.keywords.length > 0
          ? blogPackage.metadata.keywords
          : this.deriveKeywordsFromTitleAndExcerpt(
              blogPackage.metadata.title,
              blogPackage.metadata.excerpt,
            );
      const metaKeywords =
        keywordsArray.length > 0 ? keywordsArray.join(', ') : null;

      // Create SEO with full fields; fallbacks for optional OG and keywords
      const blogSeoData = {
        blogPostId: savedPost.id,
        metaTitle: blogPackage.metadata.title,
        metaDescription:
          (blogPackage.metadata.excerpt ||
            (blogPackage.content.html
              ? this.stripHtml(blogPackage.content.html).slice(0, 160)
              : null)) ?? undefined,
        metaKeywords: metaKeywords ?? undefined,
        ogTitle:
          blogPackage.metadata.ogTitle || blogPackage.metadata.title,
        ogDescription:
          blogPackage.metadata.ogDescription ||
          blogPackage.metadata.excerpt ||
          blogPackage.metadata.title,
        robots: Robots.INDEX_FOLLOW,
      };
      const blogSeo = this.blogSeoRepository.create(blogSeoData);
      await this.blogSeoRepository.save(blogSeo);
      this.logger.log('Blog SEO saved');

      // Create schema
      const blogSchema = this.blogSchemaRepository.create({
        blogPostId: savedPost.id,
        articleSchema: blogPackage.seo_technical.articleSchema,
        faqSchema: blogPackage.seo_technical.faqSchema,
      });
      await this.blogSchemaRepository.save(blogSchema);
      this.logger.log('Blog schema saved');

      // Create FAQs
      let faqCount = 0;
      if (blogPackage.faqs && blogPackage.faqs.length > 0) {
        const blogFaqs = blogPackage.faqs.map((faq, index) =>
          this.blogFaqRepository.create({
            blogPostId: savedPost.id,
            question: faq.question,
            answer: faq.answer,
            orderIndex: index + 1,
          }),
        );
        await this.blogFaqRepository.save(blogFaqs);
        faqCount = blogFaqs.length;
        this.logger.log(`Saved ${faqCount} FAQs`);
      }

      this.logger.log(
        `Successfully generated and saved blog post: ${savedPost.title}`,
      );

      // Automatically generate featured image using AI
      try {
        this.logger.log(`Automatically generating featured image for blog: ${savedPost.id}`);
        await this.imageGenerationService.generateImageFromBlog({
          blogPostId: savedPost.id,
        });
        this.logger.log('AI featured image generated and associated successfully');
      } catch (imageError) {
        // Don't fail the whole process if image generation fails
        this.logger.warn(`Failed to generate automatic featured image: ${imageError.message}`);
      }

      // Associate categories if provided
      if (categoryIds && categoryIds.length > 0) {
        await this.associateCategories(savedPost.id, categoryIds);
        this.logger.log(`Associated ${categoryIds.length} categories with blog`);
      }

      // Associate tags if provided
      if (tagIds && tagIds.length > 0) {
        await this.associateTags(savedPost.id, tagIds);
        this.logger.log(`Associated ${tagIds.length} tags with blog`);
      }

      // Send email notification to admin
      try {
        const tableOfContents = this.extractTableOfContents(
          blogPackage.content.html,
        );
        await this.emailService.sendBlogGenerationNotification({
          id: savedPost.id,
          title: savedPost.title,
          slug: savedPost.slug,
          excerpt: savedPost.excerpt || '',
          author: author.email || blogPackage.metadata.author,
          publishedAt: savedPost.publishedAt || new Date(),
          readingTime: savedPost.readingTime || 5,
          wordCount,
          faqCount,
          topic: baseTopic || undefined,
          tableOfContents,
        });
        this.logger.log('Email notification sent to admin');
      } catch (error) {
        // Don't fail the blog generation if email fails
        this.logger.warn(`Failed to send email notification: ${error.message}`);
      }

      return savedPost;
    } catch (error) {
      this.logger.error('Error generating blog:', error.message);
      throw new BadRequestException(
        `Failed to generate blog: ${error.message}`,
      );
    }
  }

  /**
   * Build enhanced prompt with category and tag context.
   * Produces a detailed brief so the AI generates a focused, step-by-step article.
   */
  private buildEnhancedPrompt(
    topic: string,
    categoryNames: string[],
    tagNames: string[],
  ): string {
    const parts: string[] = [topic];

    if (categoryNames.length > 0) {
      parts.push(
        `\nCategory: ${categoryNames.join(' > ')}. Write the article specifically for readers interested in this niche. Use terminology and examples that resonate with this audience.`,
      );
    }

    if (tagNames.length > 0) {
      parts.push(
        `\nRelated topics to weave in naturally: ${tagNames.join(', ')}. Reference these where they add genuine value — do not force them.`,
      );
    }

    parts.push(
      `\nIMPORTANT: This must be a concrete, actionable article — a comparison, mechanics explainer, or how-to depending on the topic. Include real platform names, real numbers, and common mistakes. The reader should finish knowing exactly what to check or do next.`,
    );

    return parts.join('\n');
  }

  /**
   * Associate categories with blog post
   */
  private async associateCategories(
    blogPostId: number,
    categoryIds: number[],
  ): Promise<void> {
    // Verify all categories exist
    const categories = await this.categoryRepository.find({
      where: { id: In(categoryIds) },
    });
    if (categories.length !== categoryIds.length) {
      this.logger.warn(
        `Some categories not found. Expected ${categoryIds.length}, found ${categories.length}`,
      );
    }

    // Create associations
    const blogCategories = categoryIds.map((categoryId) =>
      this.blogCategoryRepository.create({
        blogPostId,
        categoryId,
      }),
    );
    await this.blogCategoryRepository.save(blogCategories);
  }

  /**
   * Associate tags with blog post
   */
  private async associateTags(blogPostId: number, tagIds: number[]): Promise<void> {
    // Verify all tags exist
    const tags = await this.tagRepository.find({
      where: { id: In(tagIds) },
    });
    if (tags.length !== tagIds.length) {
      this.logger.warn(
        `Some tags not found. Expected ${tagIds.length}, found ${tags.length}`,
      );
    }

    // Create associations
    const blogTags = tagIds.map((tagId) =>
      this.blogTagRepository.create({
        blogPostId,
        tagId,
      }),
    );
    await this.blogTagRepository.save(blogTags);
  }

  /**
   * Get default author (first admin, editor, or any user)
   */
  private async getDefaultAuthor(): Promise<User | null> {
    // Try to get default author ID from config
    const defaultAuthorId = this.configService.get<number>(
      'DEFAULT_BLOG_AUTHOR_ID',
    );
    if (defaultAuthorId) {
      const user = await this.userRepository.findOne({
        where: { id: defaultAuthorId },
      });
      if (user) {
        return user;
      }
    }

    // Try to get first admin
    const admin = await this.userRepository.findOne({
      where: { role: 'ADMIN' as UserRole },
    });
    if (admin) {
      return admin;
    }

    // Try to get first editor
    const editor = await this.userRepository.findOne({
      where: { role: 'EDITOR' as UserRole },
    });
    if (editor) {
      return editor;
    }

    // Get first user
    const users = await this.userRepository.find({
      take: 1,
      order: { id: 'ASC' },
    });
    return users.length > 0 ? users[0] : null;
  }

  /**
   * Parse AI response JSON
   * Handles various formats: plain JSON, JSON in markdown code blocks, JSON with text before/after
   */
  private parseAiResponse(content: string): BlogPackage {
    try {
      let jsonString = content.trim();

      // Strategy 1: Try to find JSON in markdown code blocks (handles cases with text before/after)
      // This regex finds code blocks anywhere in the content, not just at the start
      const codeBlockMatch = jsonString.match(
        /```(?:json)?\s*([\s\S]*?)\s*```/,
      );
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonString = codeBlockMatch[1].trim();
        // Try parsing - if it works, we're done
        try {
          const parsed = JSON.parse(jsonString);
          return this.validateBlogPackage(parsed);
        } catch (e) {
          // If parsing fails, continue to other strategies
          this.logger.warn(
            'Failed to parse JSON from code block, trying other methods...',
          );
        }
      }

      // Strategy 2: Find the first JSON object in the content (handles text before JSON)
      const findJsonObject = (str: string): string | null => {
        const startIndex = str.indexOf('{');
        if (startIndex === -1) return null;

        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = startIndex; i < str.length; i++) {
          const char = str[i];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === '\\') {
            escapeNext = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                return str.substring(startIndex, i + 1);
              }
            }
          }
        }

        return null;
      };

      const jsonObject = findJsonObject(jsonString);
      if (jsonObject) {
        try {
          const parsed = JSON.parse(jsonObject);
          return this.validateBlogPackage(parsed);
        } catch (e) {
          this.logger.warn('Failed to parse extracted JSON object');
        }
      }

      // Strategy 3: Try parsing the entire content as-is (in case it's already clean JSON)
      try {
        const parsed = JSON.parse(jsonString);
        return this.validateBlogPackage(parsed);
      } catch (e) {
        // This will throw the final error
      }

      // If all strategies fail, throw error
      throw new Error('Could not extract valid JSON from response');
    } catch (error) {
      this.logger.error('Failed to parse AI response:', error.message);
      this.logger.error(
        'Response content (first 1000 chars):',
        content.substring(0, 1000),
      );
      throw new BadRequestException(
        `AI response is not valid JSON: ${error.message}. Please check the AI service configuration.`,
      );
    }
  }

  /**
   * Validate and normalize blog package structure
   */
  private validateBlogPackage(data: any): BlogPackage {
    const title = data.metadata?.title || 'Untitled Blog Post';
    const excerpt = data.metadata?.excerpt || '';
    const keywords =
      Array.isArray(data.metadata?.keywords) && data.metadata.keywords.length > 0
        ? data.metadata.keywords.filter((k: any) => typeof k === 'string')
        : undefined;
    return {
      metadata: {
        title,
        slug:
          data.metadata?.slug ||
          title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '') ||
          'untitled-blog-post',
        excerpt,
        author: data.metadata?.author || 'AI Assistant',
        publishedAt: data.metadata?.publishedAt || new Date().toISOString(),
        readingTime: data.metadata?.readingTime || '5 min',
        keywords,
        ogTitle: data.metadata?.ogTitle || undefined,
        ogDescription: data.metadata?.ogDescription || undefined,
      },
      content: {
        html: data.content?.html || '',
      },
      seo_technical: {
        articleSchema: data.seo_technical?.articleSchema || {},
        faqSchema: data.seo_technical?.faqSchema || {},
      },
      faqs: data.faqs || [],
    };
  }

  /**
   * Derive a short list of keywords from title and excerpt when AI does not provide keywords.
   */
  private deriveKeywordsFromTitleAndExcerpt(
    title: string,
    excerpt: string,
  ): string[] {
    const text = `${title} ${excerpt}`.toLowerCase();
    const stopWords = new Set(
      'a an the and or but in on at to for of with by from as is was are were be been being have has had do does did will would could should may might must shall can need dare ought used'.split(
        ' ',
      ),
    );
    const words = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));
    const seen = new Set<string>();
    const keywords: string[] = [];
    for (const w of words) {
      if (!seen.has(w) && keywords.length < 10) {
        seen.add(w);
        keywords.push(w);
      }
    }
    return keywords;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Parse reading time string to number
   */
  private parseReadingTime(readingTime: string): number {
    const match = readingTime.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 5;
  }

  /**
   * Calculate word count from HTML
   */
  private calculateWordCount(htmlContent: string): number {
    const text = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.split(' ').filter((word) => word.length > 0).length;
  }

  /**
   * Extract h2 and h3 headings from HTML to build a Table of Contents.
   * Mirrors the same parsing logic used by the frontend TableOfContents component.
   */
  private extractTableOfContents(
    html: string,
  ): { text: string; level: number }[] {
    const items: { text: string; level: number }[] = [];
    const headingRegex = /<h([23])[^>]*>([\s\S]*?)<\/h[23]>/gi;
    let match: RegExpExecArray | null;

    while ((match = headingRegex.exec(html)) !== null) {
      const level = parseInt(match[1], 10);
      // Strip any nested HTML tags inside the heading (e.g. <strong>, <code>)
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      if (text) {
        items.push({ text, level });
      }
    }

    return items;
  }

  /**
   * Generate a random topic — uses specific, long-tail, step-by-step topics
   * that target real search intent and produce genuinely helpful content.
   */
  private generateRandomTopic(): string {
    const topics = [
      'Betterment vs Wealthfront: Which Robo-Advisor Actually Costs Less in 2026',
      'How Robo-Advisor Tax-Loss Harvesting Actually Works (And When It Doesn\'t Help)',
      'Schwab Intelligent Portfolios: The Cash Allocation Trade-Off Explained',
      'How to Read a Robo-Advisor Fee Schedule (What They Don\'t Put on the Homepage)',
      'Robo-Advisor vs Target-Date Fund: Which Fits a Hands-Off Investor Better',
      'How Round-Up Investing Apps Actually Invest Your Spare Change',
      'Hybrid Robo-Advisors: When Paying for a Human Advisor Is Worth It',
      'ESG Robo-Advisor Portfolios: How the Screening Actually Works',
      'How Robo-Advisors Rebalance Your Portfolio (And How Often)',
      'DIY Three-Fund Portfolio vs Robo-Advisor: Real Cost Comparison',
      'Wealthfront vs Vanguard Digital Advisor: Fees, Minimums, and Features',
      'How to Set Up Goal-Based Investing in a Robo-Advisor Account',
      'Robo-Advisor Retirement Drawdown: How Automated Withdrawals Work',
      'M1 Finance vs a True Robo-Advisor: What the Difference Actually Means',
      'First-Time Investor: What to Check Before Opening a Robo-Advisor Account',
      'Dollar-Cost Averaging Automation: Setting Up Recurring Robo-Advisor Deposits',
      'How Robo-Advisors Handle Market Downturns (And What They Don\'t Tell You)',
      'Direct Indexing vs Robo-Advisor Tax-Loss Harvesting: What\'s the Real Difference',
      'Fidelity Go vs Betterment: Minimums, Fees, and Who Each One Fits',
      'How to Move an Existing Portfolio Into a Robo-Advisor Without a Tax Hit',
    ];

    return topics[Math.floor(Math.random() * topics.length)];
  }
}
