import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'trainer_absences', underscored: true })
export class TrainerAbsence extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  trainer_id: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  absence_date: string;

  @Column(DataType.TEXT)
  reason: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  notified: boolean;
}
