import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

// Platform plans that WE sell to gym owners (shops).
@Table({ tableName: 'shop_subscription_plans', underscored: true })
export class ShopSubscriptionPlan extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false })
  plan_type: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  duration_days: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  base_price: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  discount: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  sell_price: number;

  @Column(DataType.TEXT)
  description: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active: boolean;
}
