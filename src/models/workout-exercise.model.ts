import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'workout_exercises', underscored: true })
export class WorkoutExercise extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  workout_day_id: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name: string;

  @Column(DataType.INTEGER)
  sets: number;

  @Column(DataType.INTEGER)
  reps: number;

  @Column(DataType.INTEGER)
  duration_secs: number;

  @Column({ type: DataType.INTEGER, defaultValue: 60 })
  rest_secs: number;

  @Column(DataType.TEXT)
  notes: string;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  order_index: number;
}
