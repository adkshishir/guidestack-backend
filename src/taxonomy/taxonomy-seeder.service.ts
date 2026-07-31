import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Category } from './entities/category.entity';
import { Tag } from './entities/tag.entity';
import { CategoryTag } from './entities/category-tag.entity';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { SEED_CATEGORIES, getAllSeedTags } from '../seed-categories';

interface SeedUser {
  email: string;
  password: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@wealthalgor.com',
    password: 'Admin@123',
    role: UserRole.ADMIN,
  },
  {
    email: 'editor@wealthalgor.com',
    password: 'Editor@123',
    role: UserRole.EDITOR,
  },
  {
    email: 'author@wealthalgor.com',
    password: 'Author@123',
    role: UserRole.AUTHOR,
  },
];

@Injectable()
export class TaxonomySeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaxonomySeederService.name);

  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(CategoryTag)
    private categoryTagRepository: Repository<CategoryTag>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedUsers();

    // seed() is idempotent — it looks up every tag/category/link by slug
    // before creating anything — so it's safe (and necessary) to run on
    // every boot. This is what lets SEED_CATEGORIES additions in code
    // actually reach the database instead of only applying on a
    // brand-new, empty install.
    await this.seed();
  }

  /**
   * Seed default admin, editor, and author users if they don't already exist.
   */
  async seedUsers() {
    for (const seedUser of SEED_USERS) {
      const existing = await this.userRepository.findOne({
        where: { email: seedUser.email },
      });

      if (existing) {
        this.logger.log(`User already exists: ${seedUser.email} (${seedUser.role})`);
        continue;
      }

      const passwordHash = await bcrypt.hash(seedUser.password, 10);
      const user = this.userRepository.create({
        email: seedUser.email,
        passwordHash,
        role: seedUser.role,
        status: UserStatus.ACTIVE,
      });
      await this.userRepository.save(user);
      this.logger.log(`Seeded user: ${seedUser.email} (${seedUser.role})`);
    }

    this.logger.log('User seeding complete!');
  }

  async seed() {
    // 1. Create all tags first
    const seedTags = getAllSeedTags();
    const tagMap = new Map<string, Tag>();

    for (const seedTag of seedTags) {
      const existing = await this.tagRepository.findOne({
        where: { slug: seedTag.slug },
      });
      if (existing) {
        tagMap.set(seedTag.name, existing);
        continue;
      }
      const tag = this.tagRepository.create({
        name: seedTag.name,
        slug: seedTag.slug,
        description: seedTag.description,
      });
      const saved = await this.tagRepository.save(tag);
      tagMap.set(seedTag.name, saved);
    }
    this.logger.log(`Seeded ${tagMap.size} tags`);

    // 2. Create parent categories and their children
    for (const seedCat of SEED_CATEGORIES) {
      // Create parent
      let parent = await this.categoryRepository.findOne({
        where: { slug: seedCat.slug },
      });
      if (!parent) {
        parent = this.categoryRepository.create({
          name: seedCat.name,
          slug: seedCat.slug,
          description: seedCat.description,
          parentId: null,
        });
        parent = await this.categoryRepository.save(parent);
      }

      // Create children
      for (const seedChild of seedCat.children) {
        let child = await this.categoryRepository.findOne({
          where: { slug: seedChild.slug },
        });
        if (!child) {
          child = this.categoryRepository.create({
            name: seedChild.name,
            slug: seedChild.slug,
            description: seedChild.description,
            parentId: parent.id,
          });
          child = await this.categoryRepository.save(child);
        }

        // Link tags to this subcategory
        for (const tagName of seedChild.tags) {
          const tag = tagMap.get(tagName);
          if (!tag) continue;

          const exists = await this.categoryTagRepository.findOne({
            where: { categoryId: child.id, tagId: tag.id },
          });
          if (!exists) {
            const ct = this.categoryTagRepository.create({
              categoryId: child.id,
              tagId: tag.id,
            });
            await this.categoryTagRepository.save(ct);
          }
        }
      }

      this.logger.log(
        `Seeded category "${seedCat.name}" with ${seedCat.children.length} subcategories`,
      );
    }

    this.logger.log('Category and tag seeding complete!');
  }
}
