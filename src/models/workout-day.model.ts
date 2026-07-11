import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'workout_days', underscored: true })
export class WorkoutDay extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  workout_plan_id: string;

  @Column({
    type: DataType.ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    allowNull: false,
  })
  day_of_week: string;

  @Column(DataType.TEXT)
  notes: string;
}
