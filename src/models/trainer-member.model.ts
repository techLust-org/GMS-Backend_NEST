import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'trainer_members', underscored: true })
export class TrainerMember extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  trainer_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  member_id: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  assigned_at: Date;
}
