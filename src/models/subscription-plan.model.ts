import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

// Member-facing plans, defined per shop by the owner.
@Table({ tableName: 'subscription_plans', underscored: true })
export class SubscriptionPlan extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.ENUM('monthly', 'quarterly', 'yearly'), allowNull: false })
  duration: string;

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

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;
}
