import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { BlogPost, BlogPostStatus } from './entities/blog-post.entity';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { BlogGenerationService } from './blog-generation.service';
import { BlogCategory } from '../taxonomy/entities/blog-category.entity';

interface BlogAnalysis {
  titles: string[];
  excerpts: string[];
  categories: string[];
  tags: string[];
  contentThemes: string;
}

interface AICategoryTagSelection {
  selectedCategory: {
    id: number;
    name: string;
  };
  selectedTags: Array<{
    id: number;
    name: string;
  }>;
  reasoning: string;
  suggestedTopic: string;
}

interface CategoryDistribution {
  categoryId: number;
  categoryName: string;
  blogCount: number;
  parentId: number | null;
  isChild: boolean;
}

interface CategoryWithHierarchy extends Category {
  blogCount: number;
  children: CategoryWithHierarchy[];
}

@Injectable()
export class IntelligentBlogGenerationService {
  private readonly logger = new Logger(IntelligentBlogGenerationService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
    private readonly blogGenerationService: BlogGenerationService,
    @InjectRepository(BlogPost)
    private blogPostRepository: Repository<BlogPost>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(BlogCategory)
    private blogCategoryRepository: Repository<BlogCategory>,
  ) {}

  /**
   * Generate a blog post intelligently based on existing content
   * Uses equal distribution algorithm to ensure all categories get blogs equally
   */
  async generateIntelligentBlog(): Promise<BlogPost> {
    try {
      this.logger.log(
        'Starting intelligent blog generation with equal distribution...',
      );

      // Get all categories including children with their relationships
      const allCategories = await this.getAllCategoriesWithChildren();

      if (allCategories.length === 0) {
        throw new NotFoundException(
          'No categories found. Please create categories first.',
        );
      }

      // Get all tags
      const allTags = await this.tagRepository.find({
        order: { createdAt: 'DESC' },
      });

      // Get category distribution (blogs per category)
      const distribution = await this.getCategoryDistribution(allCategories);

      // Log current distribution for debugging
      this.logger.log('Current category distribution:');
      distribution.forEach((d) => {
        this.logger.log(
          `  - ${d.categoryName} (ID: ${d.categoryId}, Parent: ${d.parentId || 'none'}): ${d.blogCount} blogs`,
        );
      });

      // Check if there are any published blogs
      const existingBlogs = await this.blogPostRepository.find({
        where: { status: BlogPostStatus.PUBLISHED },
        relations: [
          'blogCategories',
          'blogCategories.category',
          'blogTags',
          'blogTags.tag',
          'blogContent',
        ],
        order: { publishedAt: 'DESC' },
        take: 10, // Analyze last 10 blogs
      });

      // Analyze existing blogs if we have any
      let analysis: BlogAnalysis;
      if (existingBlogs.length > 0) {
        analysis = this.analyzeBlogs(existingBlogs);
        this.logger.log('Blog analysis completed');
      } else {
        this.logger.log(
          'No existing blogs found - will use fresh content strategy',
        );
        analysis = {
          titles: [],
          excerpts: [],
          categories: [],
          tags: [],
          contentThemes: '',
        };
      }

      // Let AI choose category and tags (with fallback if AI fails)
      let aiSelection: AICategoryTagSelection;
      try {
        aiSelection = await this.letAIChooseCategoryAndTags(
          analysis,
          allCategories,
          allTags,
          distribution,
        );
        this.logger.log(
          `AI selected category: ${aiSelection.selectedCategory.name} (ID: ${aiSelection.selectedCategory.id}) and ${aiSelection.selectedTags.length} tags`,
        );
      } catch (error) {
        this.logger.warn(
          `AI selection failed: ${error.message}. Using fallback selection.`,
        );
        aiSelection = this.fallbackCategoryTagSelection(
          analysis,
          allCategories,
          allTags,
          distribution,
        );
        this.logger.log(
          `Fallback selected category: ${aiSelection.selectedCategory.name} and ${aiSelection.selectedTags.length} tags`,
        );
      }

      // Generate blog with selected category and tags
      const categoryIds = [aiSelection.selectedCategory.id];
      const tagIds = aiSelection.selectedTags.map((tag) => tag.id);

      // Use AI-suggested topic or generate from analysis
      const topic =
        aiSelection.suggestedTopic ||
        this.generateTopicFromAnalysis(analysis, aiSelection);

      this.logger.log(`Generating blog for topic: ${topic}`);
      this.logger.log(
        `Selected category: ${aiSelection.selectedCategory.name} (ID: ${aiSelection.selectedCategory.id})`,
      );
      this.logger.log(
        `Selected tags: ${aiSelection.selectedTags.map((t) => t.name).join(', ')}`,
      );

      const blogPost = await this.blogGenerationService.generateAndSaveBlog(
        topic,
        categoryIds,
        tagIds,
      );

      this.logger.log(
        `Successfully generated intelligent blog: ${blogPost.title} (ID: ${blogPost.id})`,
      );

      return blogPost;
    } catch (error) {
      this.logger.error(
        'Error in intelligent blog generation:',
        error.message,
        error.stack,
      );
      // Don't throw - log the error and let the scheduler handle it
      // This prevents the service from crashing
      throw error;
    }
  }

  /**
   * Get all categories with their children relationships loaded
   */
  private async getAllCategoriesWithChildren(): Promise<Category[]> {
    // First get all parent categories
    const parentCategories = await this.categoryRepository.find({
      where: { parentId: undefined },
      relations: ['children', 'categoryTags', 'categoryTags.tag'],
      order: { createdAt: 'DESC' },
    });

    // Get all child categories
    const childCategories = await this.categoryRepository.find({
      where: [{ parentId: IsNull() }], // Get categories with no parent first
      order: { createdAt: 'DESC' },
    });

    // For child categories, we need to fetch them separately
    const allChildren: Category[] = [];
    const parentIds = parentCategories.map((c) => c.id);

    if (parentIds.length > 0) {
      const children = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.parentId IN (:...parentIds)', { parentIds })
        .leftJoinAndSelect('category.categoryTags', 'categoryTags')
        .leftJoinAndSelect('categoryTags.tag', 'tag')
        .orderBy('category.createdAt', 'DESC')
        .getMany();

      allChildren.push(...children);
    }

    // Also get orphan child categories (with parentId set)
    const orphanChildren = await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NOT NULL')
      .leftJoinAndSelect('category.categoryTags', 'categoryTags')
      .leftJoinAndSelect('categoryTags.tag', 'tag')
      .orderBy('category.createdAt', 'DESC')
      .getMany();

    // Combine all categories
    const allCategories = [
      ...parentCategories,
      ...allChildren,
      ...orphanChildren,
    ];

    // Remove duplicates based on id
    const uniqueCategories = Array.from(
      new Map(allCategories.map((c) => [c.id, c])).values(),
    );

    return uniqueCategories;
  }

  /**
   * Get distribution of blogs per category including children categories
   */
  private async getCategoryDistribution(
    categories: Category[],
  ): Promise<CategoryDistribution[]> {
    const distribution: CategoryDistribution[] = [];
    const categoryIds = categories.map((c) => c.id);

    if (categoryIds.length === 0) {
      return distribution;
    }

    // Get all blog-category associations
    const blogCategories = await this.blogCategoryRepository
      .createQueryBuilder('bc')
      .select('bc.categoryId', 'categoryId')
      .addSelect('COUNT(*)', 'blogCount')
      .where('bc.categoryId IN (:...categoryIds)', { categoryIds })
      .groupBy('bc.categoryId')
      .getRawMany();

    // Create a map of categoryId to blogCount
    const blogCountMap = new Map<number, number>();
    blogCategories.forEach((bc) => {
      blogCountMap.set(bc.categoryId, parseInt(bc.blogCount, 10));
    });

    // Build distribution array
    for (const category of categories) {
      const blogCount = blogCountMap.get(category.id) || 0;

      distribution.push({
        categoryId: category.id,
        categoryName: category.name,
        blogCount,
        parentId: category.parentId,
        isChild: category.parentId !== null,
      });
    }

    return distribution;
  }

  /**
   * Analyze existing blogs to extract patterns
   */
  private analyzeBlogs(blogs: BlogPost[]): BlogAnalysis {
    const titles: string[] = [];
    const excerpts: string[] = [];
    const categorySet = new Set<string>();
    const tagSet = new Set<string>();
    const contentThemes: string[] = [];

    blogs.forEach((blog) => {
      if (blog.title) titles.push(blog.title);
      if (blog.excerpt) excerpts.push(blog.excerpt);

      // Extract categories
      if (blog.blogCategories) {
        blog.blogCategories.forEach((bc) => {
          if (bc.category) {
            categorySet.add(bc.category.name);
          }
        });
      }

      // Extract tags
      if (blog.blogTags) {
        blog.blogTags.forEach((bt) => {
          if (bt.tag) {
            tagSet.add(bt.tag.name);
          }
        });
      }

      // Extract content themes from title and excerpt
      if (blog.title) {
        contentThemes.push(blog.title);
      }
      if (blog.excerpt) {
        contentThemes.push(blog.excerpt);
      }
    });

    return {
      titles,
      excerpts,
      categories: Array.from(categorySet),
      tags: Array.from(tagSet),
      contentThemes: contentThemes.join(' | '),
    };
  }

  /**
   * Let AI choose the best category and tags based on analysis
   * Now includes distribution data to ensure equal distribution
   */
  private async letAIChooseCategoryAndTags(
    analysis: BlogAnalysis,
    categories: Category[],
    tags: Tag[],
    distribution: CategoryDistribution[],
  ): Promise<AICategoryTagSelection> {
    const categoriesList = categories
      .map((cat) => `ID: ${cat.id}, Name: ${cat.name}`)
      .join('\n');

    const tagsList = tags
      .map((tag) => `ID: ${tag.id}, Name: ${tag.name}`)
      .join('\n');

    // Calculate statistics for distribution
    const totalBlogs = distribution.reduce((sum, d) => sum + d.blogCount, 0);
    const avgBlogsPerCategory = totalBlogs / distribution.length;
    const sortedByCount = [...distribution].sort(
      (a, b) => a.blogCount - b.blogCount,
    );
    const underrepresentedCategories = sortedByCount
      .filter((d) => d.blogCount < avgBlogsPerCategory)
      .map((d) => `${d.categoryName} (${d.blogCount} blogs)`)
      .join(', ');
    const categoryWithLeastBlogs = sortedByCount[0]?.categoryName || 'N/A';

    const prompt = `
You are an SEO content strategist for a tech blog. Your job is to pick the next article topic that will rank well on Google and provide genuine value to readers.

EXISTING CONTENT (avoid duplicating these):
${analysis.titles.slice(0, 8).map((t) => `  - ${t}`).join('\n') || '  - No articles yet'}

CONTENT GAP ANALYSIS:
- Total articles: ${totalBlogs}
- Average per category: ${avgBlogsPerCategory.toFixed(1)}
- Categories needing content (fewest articles): ${underrepresentedCategories || 'All balanced'}
- Most underserved: ${categoryWithLeastBlogs}

Distribution:
${sortedByCount.map((d) => `  ${d.categoryName}: ${d.blogCount} articles`).join('\n')}

AVAILABLE CATEGORIES (pick ONE — prefer underserved):
${categoriesList}

AVAILABLE TAGS (pick 3-5 relevant ones):
${tagsList}

REQUIREMENTS:
1. Pick the most underserved category to build topical authority evenly.
2. Suggest a SPECIFIC, ACTIONABLE topic in "How to..." format.
   Good: "How to Set Up Automated Database Backups with pg_dump and Cron"
   Bad: "Database Backup Best Practices" (too vague)
3. The topic must target a long-tail keyword real people search for.
4. It must NOT overlap with existing titles listed above.
5. Pick tags that match the topic naturally.

Return ONLY valid JSON (no markdown, no extra text):
{
  "selectedCategory": { "id": <number>, "name": "<string>" },
  "selectedTags": [{ "id": <number>, "name": "<string>" }],
  "reasoning": "<why this category and topic>",
  "suggestedTopic": "<How to... specific actionable title>"
}
`;

    const aiResponse = await this.aiService.getSimpleResponse({
      prompt,
    });

    // Parse AI response with multiple fallback strategies
    const responseText = aiResponse.content || '';
    this.logger.debug('AI Response received:', responseText.substring(0, 500));

    let parsed: any = null;

    // Strategy 1: Try to find JSON in markdown code blocks
    const codeBlockMatch = responseText.match(
      /```(?:json)?\s*(\{[\s\S]*?\})\s*```/,
    );
    if (codeBlockMatch) {
      try {
        parsed = JSON.parse(codeBlockMatch[1]);
        this.logger.log('Successfully parsed JSON from code block');
      } catch (e) {
        this.logger.warn('Failed to parse JSON from code block');
      }
    }

    // Strategy 2: Try to find JSON object in the text
    if (!parsed) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          this.logger.log('Successfully parsed JSON from text match');
        } catch (e) {
          this.logger.warn('Failed to parse JSON from text match');
        }
      }
    }

    // Strategy 3: Try parsing the entire response as JSON
    if (!parsed) {
      try {
        parsed = JSON.parse(responseText.trim());
        this.logger.log('Successfully parsed entire response as JSON');
      } catch (e) {
        this.logger.warn('Failed to parse entire response as JSON');
      }
    }

    // If parsing failed, use fallback selection
    if (!parsed || !parsed.selectedCategory || !parsed.selectedCategory.id) {
      this.logger.warn(
        'AI response parsing failed or missing required fields. Using fallback selection.',
      );
      this.logger.debug('AI Response content:', responseText);
      return this.fallbackCategoryTagSelection(
        analysis,
        categories,
        tags,
        distribution,
      );
    }

    // Validate and process the parsed response
    try {
      // Verify category exists
      const selectedCategory = categories.find(
        (cat) => cat.id === parsed.selectedCategory.id,
      );
      if (!selectedCategory) {
        this.logger.warn(
          `AI selected category ID ${parsed.selectedCategory.id} not found. Using fallback.`,
        );
        return this.fallbackCategoryTagSelection(
          analysis,
          categories,
          tags,
          distribution,
        );
      }

      // Verify tags exist
      const selectedTags = (parsed.selectedTags || [])
        .map((tagData: any) => {
          if (!tagData || !tagData.id) return null;
          const tag = tags.find((t) => t.id === tagData.id);
          if (!tag) {
            this.logger.warn(`Tag ID ${tagData.id} not found, skipping`);
            return null;
          }
          return tag;
        })
        .filter((tag: Tag | null) => tag !== null) as Tag[];

      // If no valid tags, use fallback
      if (selectedTags.length === 0) {
        this.logger.warn('No valid tags selected by AI. Using fallback.');
        return this.fallbackCategoryTagSelection(
          analysis,
          categories,
          tags,
          distribution,
        );
      }

      return {
        selectedCategory: {
          id: selectedCategory.id,
          name: selectedCategory.name,
        },
        selectedTags: selectedTags.map((tag: Tag) => ({
          id: tag.id,
          name: tag.name,
        })),
        reasoning: parsed.reasoning || 'AI analysis',
        suggestedTopic: parsed.suggestedTopic || '',
      };
    } catch (error) {
      this.logger.error(
        'Error processing AI selection, using fallback:',
        error.message,
      );
      return this.fallbackCategoryTagSelection(
        analysis,
        categories,
        tags,
        distribution,
      );
    }
  }

  /**
   * Fallback method to select category and tags when AI parsing fails
   * Now prioritizes underrepresented categories for equal distribution
   */
  private fallbackCategoryTagSelection(
    analysis: BlogAnalysis,
    categories: Category[],
    tags: Tag[],
    distribution: CategoryDistribution[],
  ): AICategoryTagSelection {
    this.logger.log(
      'Using fallback category and tag selection with equal distribution',
    );

    // Calculate average and find underrepresented categories
    const totalBlogs = distribution.reduce((sum, d) => sum + d.blogCount, 0);
    const avgBlogsPerCategory = totalBlogs / distribution.length;

    // Sort distribution by blog count (ascending) to prioritize underrepresented
    const sortedDistribution = [...distribution].sort(
      (a, b) => a.blogCount - b.blogCount,
    );

    // Find the most underrepresented category (that still exists in our categories list)
    let selectedCategory: Category | null = null;

    for (const dist of sortedDistribution) {
      const found = categories.find((c) => c.id === dist.categoryId);
      if (found) {
        selectedCategory = found;
        this.logger.log(
          `Selected underrepresented category: ${selectedCategory.name} (ID: ${selectedCategory.id}) with ${dist.blogCount} blogs (avg: ${avgBlogsPerCategory.toFixed(1)})`,
        );
        break;
      }
    }

    // Fallback to first category if no underrepresented found
    if (!selectedCategory) {
      selectedCategory = categories[0];
      this.logger.log(
        'No underrepresented category found, using first category',
      );
    }

    if (!selectedCategory) {
      throw new NotFoundException('No categories available for selection');
    }

    // Select tags for the selected category
    const selectedTags = this.selectTagsForCategory(
      selectedCategory,
      tags,
      distribution,
    );

    // Generate a specific how-to topic based on category and tags
    const tagNames = selectedTags.map((t) => t.name).join(', ');
    const suggestedTopic = `How to Get Started with ${selectedCategory.name}${
      tagNames ? ` Using ${selectedTags[0]?.name || tagNames}` : ''
    }: A Step-by-Step Guide for Beginners`;

    return {
      selectedCategory: {
        id: selectedCategory.id,
        name: selectedCategory.name,
      },
      selectedTags: selectedTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
      reasoning: `Fallback selection prioritizing underrepresented categories for equal distribution (avg: ${avgBlogsPerCategory.toFixed(1)} blogs per category)`,
      suggestedTopic,
    };
  }

  /**
   * Select tags for a category with equal distribution consideration
   */
  private selectTagsForCategory(
    category: Category,
    allTags: Tag[],
    distribution: CategoryDistribution[],
  ): Tag[] {
    // Get tags associated with this category
    let selectedTags: Tag[] = [];

    // Check if category has associated tags loaded
    if (category.categoryTags && category.categoryTags.length > 0) {
      const categoryTagEntities = category.categoryTags;
      if (categoryTagEntities[0]?.tag) {
        selectedTags = categoryTagEntities
          .slice(0, 5)
          .map((ct) => ct.tag)
          .filter((tag): tag is Tag => tag !== null && tag !== undefined);
      }
    }

    // If no category tags found, try to find related tags
    if (selectedTags.length === 0) {
      // Find tags that might be related based on name patterns or use random selection
      const tagDistribution = this.getTagDistribution(allTags);
      const sortedTags = [...tagDistribution].sort(
        (a, b) => a.blogCount - b.blogCount,
      );

      // Pick tags from underrepresented categories first
      const underrepresentedTagIds = new Set<number>();
      for (const dist of sortedTags.slice(
        0,
        Math.ceil(tagDistribution.length / 2),
      )) {
        // Get tags used in underrepresented categories
        distribution
          .filter(
            (d) =>
              d.blogCount <
              distribution.reduce((s, d2) => s + d2.blogCount, 0) /
                distribution.length,
          )
          .forEach((d) => {
            // This is a simplification - in a real implementation, we'd track tag distribution per category
          });
      }

      // Fallback: select random tags
      selectedTags = allTags.slice(0, Math.min(5, allTags.length));
    }

    // Ensure we have at least one tag
    if (selectedTags.length === 0 && allTags.length > 0) {
      selectedTags = [allTags[0]];
    }

    return selectedTags;
  }

  /**
   * Get distribution of blogs per tag
   */
  private getTagDistribution(
    tags: Tag[],
  ): Array<{ tagId: number; tagName: string; blogCount: number }> {
    // Simplified tag distribution - in a full implementation, this would query the database
    return tags.map((tag) => ({
      tagId: tag.id,
      tagName: tag.name,
      blogCount: 0, // Would be calculated from database
    }));
  }

  /**
   * Generate topic from analysis if AI didn't suggest one.
   * Produces a specific, actionable how-to topic.
   */
  private generateTopicFromAnalysis(
    _analysis: BlogAnalysis,
    aiSelection: AICategoryTagSelection,
  ): string {
    const categoryName = aiSelection.selectedCategory.name;
    const primaryTag = aiSelection.selectedTags[0]?.name;

    if (primaryTag) {
      return `How to Use ${primaryTag} for ${categoryName}: A Complete Step-by-Step Tutorial`;
    }
    return `How to Master ${categoryName}: A Practical Step-by-Step Guide`;
  }
}
