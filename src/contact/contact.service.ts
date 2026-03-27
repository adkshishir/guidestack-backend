import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepository.create(createContactDto);
    const savedContact = await this.contactRepository.save(contact);

    // Send email notification to admin
    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 
                        this.configService.get<string>('MAIL_FROM');
      
      if (adminEmail) {
        await this.emailService.sendEmail(
          adminEmail,
          `New Contact Form Submission: ${createContactDto.subject || 'No Subject'}`,
          this.generateEmailHtml(savedContact),
          this.generateEmailText(savedContact),
        );
      }
    } catch (error) {
      // Log error but don't fail the contact creation
      console.error('Failed to send contact email notification:', error);
    }

    return savedContact;
  }

  async findAll(): Promise<Contact[]> {
    return this.contactRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.contactRepository.findOne({ where: { id } });
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  private generateEmailHtml(contact: Contact): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 20px; margin-top: 20px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: bold; color: #4F46E5; }
            .value { margin-top: 5px; padding: 10px; background-color: white; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Contact Form Submission</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${contact.name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value">${contact.email}</div>
              </div>
              ${contact.subject ? `
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${contact.subject}</div>
              </div>
              ` : ''}
              <div class="field">
                <div class="label">Message:</div>
                <div class="value">${contact.message.replace(/\n/g, '<br>')}</div>
              </div>
              <div class="field">
                <div class="label">Submitted:</div>
                <div class="value">${contact.createdAt.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private generateEmailText(contact: Contact): string {
    return `
New Contact Form Submission

Name: ${contact.name}
Email: ${contact.email}
${contact.subject ? `Subject: ${contact.subject}\n` : ''}
Message:
${contact.message}

Submitted: ${contact.createdAt.toLocaleString()}
    `.trim();
  }
}

