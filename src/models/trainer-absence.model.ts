import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'trainer_absences', underscored: true })
export class TrainerAbsence extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  trainer_id: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  absence_date: string;

  @Column(DataType.TEXT)
  reason: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  notified: boolean;
}
