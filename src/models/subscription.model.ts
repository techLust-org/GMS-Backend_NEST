import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'subscriptions', underscored: true })
export class Subscription extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  member_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  plan_id: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  start_date: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  end_date: string;

  @Column({ type: DataType.ENUM('active', 'expired', 'cancelled', 'pending'), defaultValue: 'active' })
  status: string;

  @Column(DataType.DECIMAL(10, 2))
  base_price: number;

  @Column(DataType.DECIMAL(10, 2))
  sell_price: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount_paid: number;

  @Column({ type: DataType.STRING(50), defaultValue: 'cash' })
  payment_method: string;

  @Column(DataType.STRING(100))
  payment_ref: string;

  @Column(DataType.STRING)
  razorpay_order_id: string;

  @Column(DataType.STRING)
  razorpay_payment_id: string;
}
