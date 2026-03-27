import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogTask } from './entities/blog-task.entity';
import { CreateBlogTaskDto } from './dto/create-blog-task.dto';
import { UpdateBlogTaskDto } from './dto/update-blog-task.dto';
import { BlogSchedulerService } from './blog-scheduler.service';

@Injectable()
export class BlogTaskService {
  constructor(
    @InjectRepository(BlogTask)
    private blogTaskRepository: Repository<BlogTask>,
    @Inject(forwardRef(() => BlogSchedulerService))
    private blogSchedulerService: BlogSchedulerService,
  ) {}

  async create(createBlogTaskDto: CreateBlogTaskDto): Promise<BlogTask> {
    // Check active tasks count BEFORE creating the new task
    const activeTasksBefore = await this.findAll(true);
    const activeCountBefore = activeTasksBefore.length;

    const task = this.blogTaskRepository.create(createBlogTaskDto);
    const savedTask = await this.blogTaskRepository.save(task);

    // Only wake up scheduler if:
    // 1. The new task is active
    // 2. There were NO active tasks before (scheduler was sleeping)
    // 3. Now there is at least one active task (scheduler should wake up)
    if (savedTask.isActive && activeCountBefore === 0) {
      // This is the first active task - wake up the sleeping scheduler
      this.blogSchedulerService.wakeUpScheduler();
    }
    // If there were already active tasks, scheduler is already running, no need to wake up

    return savedTask;
  }

  async findAll(activeOnly?: boolean): Promise<BlogTask[]> {
    if (activeOnly) {
      return await this.blogTaskRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
    }
    return await this.blogTaskRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<BlogTask> {
    const task = await this.blogTaskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Blog task with ID ${id} not found`);
    }
    return task;
  }

  async findNextActiveTask(): Promise<BlogTask | null> {
    return await this.blogTaskRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    id: number,
    updateBlogTaskDto: UpdateBlogTaskDto,
  ): Promise<BlogTask> {
    const task = await this.findOne(id);
    const wasActive = task.isActive;

    // Check active tasks count BEFORE updating (excluding the current task)
    const activeTasksBefore = await this.findAll(true);
    // Count active tasks excluding the current task being updated
    const activeCountBefore = activeTasksBefore.filter(
      (t) => t.id !== id,
    ).length;

    Object.assign(task, updateBlogTaskDto);
    const savedTask = await this.blogTaskRepository.save(task);

    // Only wake up scheduler if:
    // 1. Task was inactive and is now active (task became active)
    // 2. There were NO other active tasks before (scheduler was sleeping)
    // 3. Now there is at least one active task (scheduler should wake up)
    if (!wasActive && savedTask.isActive && activeCountBefore === 0) {
      // This is the first active task - wake up the sleeping scheduler
      this.blogSchedulerService.wakeUpScheduler();
    }
    // If there were already other active tasks, scheduler is already running, no need to wake up
    // If task was already active, no change in active count, no need to wake up

    return savedTask;
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.blogTaskRepository.remove(task);
  }

  async deactivate(id: number): Promise<BlogTask> {
    const task = await this.findOne(id);
    task.isActive = false;
    return await this.blogTaskRepository.save(task);
  }
}
