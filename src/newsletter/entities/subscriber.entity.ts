import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SubscriberStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
}

@Entity('subscribers')
export class Subscriber {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({
    type: 'enum',
    enum: SubscriberStatus,
    default: SubscriberStatus.PENDING,
  })
  status: SubscriberStatus;

  @Column({ nullable: true })
  name?: string;

  @Column({ unique: true })
  verificationToken: string;

  @Column({ nullable: true })
  unsubscribeToken: string;

  @Column({ nullable: true, type: 'varchar' })
  commentToken: string;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  unsubscribedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastEmailSentAt?: Date;

  @Column({ default: 0 })
  emailsSent: number;

  @Column({ default: 0 })
  emailsOpened: number;

  @Column({ default: 0 })
  emailsClicked: number;

  @Column({ nullable: true })
  ipAddress?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  source?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
