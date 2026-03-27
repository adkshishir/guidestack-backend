import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
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
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact } from './entities/contact.entity';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a contact form',
    description: 'Creates a new contact submission and sends email notification to admin',
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({
    status: 201,
    description: 'Contact submitted successfully',
    type: Contact,
  })
  @ApiBadRequestResponse({ description: 'Bad request - validation failed' })
  async create(@Body() createContactDto: CreateContactDto): Promise<Contact> {
    return this.contactService.create(createContactDto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get all contact submissions',
    description: 'Returns a list of all contact submissions (admin/editor only)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all contacts',
    type: [Contact],
  })
  async findAll(): Promise<Contact[]> {
    return this.contactService.findAll();
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get a contact submission by ID',
    description: 'Returns a single contact submission by its ID (admin/editor only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Contact ID' })
  @ApiResponse({
    status: 200,
    description: 'Contact found',
    type: Contact,
  })
  @ApiNotFoundResponse({ description: 'Contact not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Contact> {
    return this.contactService.findOne(id);
  }
}

