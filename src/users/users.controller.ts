import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAuthorProfileDto } from './dto/create-author-profile.dto';
import { UpdateAuthorProfileDto } from './dto/update-author-profile.dto';
import { User } from './entities/user.entity';
import { AuthorProfile } from './entities/author-profile.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from './entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // User endpoints
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Creates a new user account. Only admins can create users.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns a list of all users. Admin and Editor roles only.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [User],
  })
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the profile of the currently authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: User,
  })
  async getCurrentUser(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findOne(user.id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({
    summary: 'Get a user by ID',
    description: 'Returns a single user by their ID. Admin and Editor roles only.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    type: User,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update a user',
    description: 'Updates an existing user. Only admins can update users.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({ description: 'User with this email already exists' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Deletes a user. Only admins can delete users.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.usersService.remove(id);
  }

  // Author Profile endpoints
  @Post('profiles')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an author profile',
    description: 'Creates an author profile for a user',
  })
  @ApiBody({ type: CreateAuthorProfileDto })
  @ApiResponse({
    status: 201,
    description: 'Author profile created successfully',
    type: AuthorProfile,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiConflictResponse({
    description: 'Author profile for this user already exists',
  })
  async createAuthorProfile(
    @Body() createAuthorProfileDto: CreateAuthorProfileDto,
  ): Promise<AuthorProfile> {
    return this.usersService.createAuthorProfile(createAuthorProfileDto);
  }

  @Get('profiles/user/:userId')
  @Public()
  @ApiOperation({
    summary: 'Get author profile by user ID',
    description: 'Returns the author profile for a specific user',
  })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Author profile found',
    type: AuthorProfile,
  })
  @ApiNotFoundResponse({ description: 'Author profile not found' })
  async getAuthorProfileByUserId(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<AuthorProfile> {
    return this.usersService.findAuthorProfileByUserId(userId);
  }

  @Get('profiles/:id')
  @Public()
  @ApiOperation({
    summary: 'Get author profile by ID',
    description: 'Returns an author profile by its ID',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Author profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Author profile found',
    type: AuthorProfile,
  })
  @ApiNotFoundResponse({ description: 'Author profile not found' })
  async getAuthorProfileById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AuthorProfile> {
    return this.usersService.findAuthorProfileById(id);
  }

  @Patch('profiles/user/:userId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR)
  @ApiOperation({
    summary: 'Update an author profile',
    description: 'Updates an existing author profile',
  })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiBody({ type: UpdateAuthorProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Author profile updated successfully',
    type: AuthorProfile,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  @ApiNotFoundResponse({ description: 'Author profile not found' })
  async updateAuthorProfile(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateAuthorProfileDto: UpdateAuthorProfileDto,
  ): Promise<AuthorProfile> {
    return this.usersService.updateAuthorProfile(userId, updateAuthorProfileDto);
  }

  @Delete('profiles/user/:userId')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an author profile',
    description: 'Deletes an author profile. Admin and Editor roles only.',
  })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({
    status: 204,
    description: 'Author profile deleted successfully',
  })
  @ApiNotFoundResponse({ description: 'Author profile not found' })
  async removeAuthorProfile(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<void> {
    return this.usersService.removeAuthorProfile(userId);
  }
}

