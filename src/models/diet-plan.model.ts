import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'diet_plans', underscored: true })
export class DietPlan extends Model {
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

  @Column(DataType.INTEGER)
  daily_calories: number;

  @Column(DataType.INTEGER)
  protein_grams: number;

  @Column(DataType.INTEGER)
  carbs_grams: number;

  @Column(DataType.INTEGER)
  fat_grams: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;
}
