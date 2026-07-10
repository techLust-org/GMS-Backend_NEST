import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'workout_exercises', underscored: true })
export class WorkoutExercise extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  workout_day_id: number;

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
