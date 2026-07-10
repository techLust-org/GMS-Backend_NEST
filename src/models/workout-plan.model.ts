import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'workout_plans', underscored: true })
export class WorkoutPlan extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  trainer_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  member_id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  title: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.STRING(100))
  goal: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @Column(DataType.DATEONLY)
  start_date: string;

  @Column(DataType.DATEONLY)
  end_date: string;
}
