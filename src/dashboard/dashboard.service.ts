import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost, BlogPostStatus } from '../blog/entities/blog-post.entity';
import { BlogAnalytics } from '../blog/entities/blog-analytics.entity';
import { User } from '../users/entities/user.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Category } from '../taxonomy/entities/category.entity';
import { Tag } from '../taxonomy/entities/tag.entity';
import { Subscriber } from '../newsletter/entities/subscriber.entity';

export interface DashboardCounts {
  blogPosts: number;
  publishedPosts: number;
  draftPosts: number;
  users: number;
  comments: number;
  categories: number;
  tags: number;
  subscribers: number;
}

export interface PostsOverTimeItem {
  date: string;
  count: number;
  published: number;
}

export interface EngagementStats {
  totalViews: number;
  totalLikes: number;
  topPostsByViews: Array<{ id: number; title: string; slug: string; views: number }>;
  topPostsByLikes: Array<{ id: number; title: string; slug: string; likes: number }>;
}

export interface PostsByStatusItem {
  status: string;
  count: number;
}

export interface DashboardAnalytics {
  counts: DashboardCounts;
  postsOverTime: PostsOverTimeItem[];
  engagement: EngagementStats;
  postsByStatus: PostsByStatusItem[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(BlogAnalytics)
    private readonly analyticsRepository: Repository<BlogAnalytics>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(Subscriber)
    private readonly subscriberRepository: Repository<Subscriber>,
  ) {}

  async getAnalytics(days = 30): Promise<DashboardAnalytics> {
    const [counts, postsOverTime, engagement, postsByStatus] = await Promise.all([
      this.getCounts(),
      this.getPostsOverTime(days),
      this.getEngagement(),
      this.getPostsByStatus(),
    ]);
    return { counts, postsOverTime, engagement, postsByStatus };
  }

  private async getCounts(): Promise<DashboardCounts> {
    const [
      blogPosts,
      publishedPosts,
      draftPosts,
      users,
      comments,
      categories,
      tags,
      subscribers,
    ] = await Promise.all([
      this.blogPostRepository.count(),
      this.blogPostRepository.count({ where: { status: BlogPostStatus.PUBLISHED } }),
      this.blogPostRepository.count({ where: { status: BlogPostStatus.DRAFT } }),
      this.userRepository.count(),
      this.commentRepository.count(),
      this.categoryRepository.count(),
      this.tagRepository.count(),
      this.subscriberRepository.count(),
    ]);

    return {
      blogPosts,
      publishedPosts,
      draftPosts,
      users,
      comments,
      categories,
      tags,
      subscribers,
    };
  }

  private async getPostsOverTime(days: number): Promise<PostsOverTimeItem[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const qb = this.blogPostRepository
      .createQueryBuilder('post')
      .select("DATE_TRUNC('day', post.created_at)", 'day')
      .addSelect('COUNT(*)', 'count')
      .addSelect(
        `SUM(CASE WHEN post.status = 'PUBLISHED' THEN 1 ELSE 0 END)`,
        'published',
      )
      .where('post.created_at >= :start', { start: startDate })
      .groupBy("DATE_TRUNC('day', post.created_at)")
      .orderBy('day', 'ASC');

    const raw = await qb.getRawMany<{ day: Date; count: string; published: string }>();

    const byDay = new Map<string, { count: number; published: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { count: 0, published: 0 });
    }
    raw.forEach((r) => {
      const key = new Date(r.day).toISOString().slice(0, 10);
      const existing = byDay.get(key) ?? { count: 0, published: 0 };
      existing.count += parseInt(r.count, 10);
      existing.published += parseInt(r.published, 10);
      byDay.set(key, existing);
    });

    return Array.from(byDay.entries())
      .map(([date, { count, published }]) => ({ date, count, published }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getEngagement(): Promise<EngagementStats> {
    const [totals, topViewsRows, topLikesRows] = await Promise.all([
      this.analyticsRepository
        .createQueryBuilder('a')
        .select('COALESCE(SUM(a.views), 0)', 'totalViews')
        .addSelect('COALESCE(SUM(a.likes), 0)', 'totalLikes')
        .getRawOne<{ totalViews: string; totalLikes: string }>(),
      this.analyticsRepository
        .createQueryBuilder('a')
        .innerJoin('a.blogPost', 'post')
        .select('post.id', 'id')
        .addSelect('post.title', 'title')
        .addSelect('post.slug', 'slug')
        .addSelect('a.views', 'views')
        .orderBy('a.views', 'DESC')
        .limit(5)
        .getRawMany<{ id: number; title: string; slug: string; views: string }>(),
      this.analyticsRepository
        .createQueryBuilder('a')
        .innerJoin('a.blogPost', 'post')
        .select('post.id', 'id')
        .addSelect('post.title', 'title')
        .addSelect('post.slug', 'slug')
        .addSelect('a.likes', 'likes')
        .orderBy('a.likes', 'DESC')
        .limit(5)
        .getRawMany<{ id: number; title: string; slug: string; likes: string }>(),
    ]);

    const totalViews = parseInt(totals?.totalViews ?? '0', 10);
    const totalLikes = parseInt(totals?.totalLikes ?? '0', 10);
    const topPostsByViews = (topViewsRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      views: parseInt(r.views ?? '0', 10),
    }));
    const topPostsByLikes = (topLikesRows ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      likes: parseInt(r.likes ?? '0', 10),
    }));

    return {
      totalViews,
      totalLikes,
      topPostsByViews,
      topPostsByLikes,
    };
  }

  private async getPostsByStatus(): Promise<PostsByStatusItem[]> {
    const raw = await this.blogPostRepository
      .createQueryBuilder('post')
      .select('post.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('post.status')
      .getRawMany<{ status: string; count: string }>();

    const statusOrder = [
      BlogPostStatus.PUBLISHED,
      BlogPostStatus.DRAFT,
      BlogPostStatus.REVIEW,
      BlogPostStatus.ARCHIVED,
    ];
    return raw
      .map((r) => ({ status: r.status, count: parseInt(r.count, 10) }))
      .sort(
        (a, b) =>
          statusOrder.indexOf(a.status as BlogPostStatus) -
          statusOrder.indexOf(b.status as BlogPostStatus),
      );
  }
}
