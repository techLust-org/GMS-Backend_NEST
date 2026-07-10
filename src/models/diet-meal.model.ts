import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'diet_meals', underscored: true })
export class DietMeal extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  diet_plan_id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  meal_name: string;

  @Column(DataType.STRING(10))
  meal_time: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  foods: string;

  @Column(DataType.INTEGER)
  calories: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  order_index: number;
}
