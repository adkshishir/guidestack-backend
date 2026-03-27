import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { AuthorProfile } from './entities/author-profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAuthorProfileDto } from './dto/create-author-profile.dto';
import { UpdateAuthorProfileDto } from './dto/update-author-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(AuthorProfile)
    private authorProfileRepository: Repository<AuthorProfile>,
  ) {}

  // User methods
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role || UserRole.AUTHOR,
      status: createUserDto.status || UserStatus.ACTIVE,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['authorProfile'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['authorProfile'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['authorProfile'],
    });
  }

  async findOneWithSecret(id: number): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.twoFactorSecret')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
      user.email = updateUserDto.email;
    }

    // Update password if provided
    if (updateUserDto.password) {
      user.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update role if provided
    if (updateUserDto.role) {
      user.role = updateUserDto.role;
    }

    // Update status if provided
    if (updateUserDto.status) {
      user.status = updateUserDto.status;
    }

    if (updateUserDto.twoFactorSecret !== undefined) {
      user.twoFactorSecret = updateUserDto.twoFactorSecret;
    }

    if (updateUserDto.isTwoFactorEnabled !== undefined) {
      user.isTwoFactorEnabled = updateUserDto.isTwoFactorEnabled;
    }

    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  // Author Profile methods
  async createAuthorProfile(
    createAuthorProfileDto: CreateAuthorProfileDto,
  ): Promise<AuthorProfile> {
    // Check if user exists
    const user = await this.findOne(createAuthorProfileDto.userId);

    // Check if profile already exists
    const existingProfile = await this.authorProfileRepository.findOne({
      where: { userId: createAuthorProfileDto.userId },
    });
    if (existingProfile) {
      throw new ConflictException(
        'Author profile for this user already exists',
      );
    }

    const profile = this.authorProfileRepository.create(createAuthorProfileDto);
    return this.authorProfileRepository.save(profile);
  }

  async findAuthorProfileByUserId(userId: number): Promise<AuthorProfile> {
    const profile = await this.authorProfileRepository.findOne({
      where: { userId },
      relations: ['user', 'avatarMedia'],
    });
    if (!profile) {
      throw new NotFoundException(
        `Author profile for user ID ${userId} not found`,
      );
    }
    return profile;
  }

  async findAuthorProfileById(id: number): Promise<AuthorProfile> {
    const profile = await this.authorProfileRepository.findOne({
      where: { id },
      relations: ['user', 'avatarMedia'],
    });
    if (!profile) {
      throw new NotFoundException(`Author profile with ID ${id} not found`);
    }
    return profile;
  }

  async updateAuthorProfile(
    userId: number,
    updateAuthorProfileDto: UpdateAuthorProfileDto,
  ): Promise<AuthorProfile> {
    const profile = await this.findAuthorProfileByUserId(userId);

    // Update fields
    if (updateAuthorProfileDto.displayName !== undefined) {
      profile.displayName = updateAuthorProfileDto.displayName;
    }
    if (updateAuthorProfileDto.bio !== undefined) {
      profile.bio = updateAuthorProfileDto.bio;
    }
    if (updateAuthorProfileDto.avatarMediaId !== undefined) {
      profile.avatarMediaId = updateAuthorProfileDto.avatarMediaId;
    }
    if (updateAuthorProfileDto.expertiseTopics !== undefined) {
      profile.expertiseTopics = updateAuthorProfileDto.expertiseTopics;
    }
    if (updateAuthorProfileDto.socialLinks !== undefined) {
      profile.socialLinks = updateAuthorProfileDto.socialLinks;
    }

    return this.authorProfileRepository.save(profile);
  }

  async removeAuthorProfile(userId: number): Promise<void> {
    const profile = await this.findAuthorProfileByUserId(userId);
    await this.authorProfileRepository.remove(profile);
  }
}
