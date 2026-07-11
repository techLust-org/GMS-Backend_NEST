import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'diet_meals', underscored: true })
export class DietMeal extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  diet_plan_id: string;

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
