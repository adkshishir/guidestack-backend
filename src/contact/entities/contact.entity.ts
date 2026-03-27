import { Entity, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('contacts')
export class Contact extends BaseEntity {
  @ApiProperty({
    description: 'Contact name',
    example: 'John Doe',
    type: String,
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Contact email',
    example: 'john@example.com',
    type: String,
  })
  @Column()
  email: string;

  @ApiPropertyOptional({
    description: 'Contact subject',
    example: 'Question about blog',
    type: String,
  })
  @Column({ nullable: true })
  subject: string;

  @ApiProperty({
    description: 'Contact message',
    example: 'I have a question about...',
    type: String,
  })
  @Column({ type: 'text' })
  message: string;
}
