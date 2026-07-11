import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'workout_plans', underscored: true })
export class WorkoutPlan extends Model {
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
