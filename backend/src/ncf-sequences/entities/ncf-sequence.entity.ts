import { Entity, Column, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NcfType } from '../../common/enums/ncf-type.enum';

@Entity('ncf_sequences')
@Unique(['tenantId', 'ncfType'])
export class NcfSequence extends BaseEntity {
  @Column()
  tenantId: string;

  @Column({ type: 'varchar', length: 10 })
  ncfType: NcfType;

  @Column({ default: 0 })
  currentSequence: number;

  @Column({ default: 1 })
  startSequence: number;

  @Column({ default: 9999999 })
  endSequence: number;

  @Column({ default: true })
  isActive: boolean;
}
