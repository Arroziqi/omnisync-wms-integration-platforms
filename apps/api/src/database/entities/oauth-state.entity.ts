import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('oauth_states')
export class OAuthStateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  state: string;

  @Column({ type: 'varchar' })
  marketplace: string;

  @Column({ name: 'expired_at', type: 'timestamp' })
  expiredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
