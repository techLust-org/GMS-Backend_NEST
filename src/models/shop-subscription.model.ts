import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// A shop's subscription to the platform (owner pays us).
@Table({ tableName: 'shop_subscriptions', underscored: true })
export class ShopSubscription extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  plan_id: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  base_price: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  sell_price: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  start_date: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  end_date: string;

  @Column({ type: DataType.ENUM('active', 'expired', 'cancelled', 'pending'), defaultValue: 'active' })
  status: string;

  @Column(DataType.STRING)
  razorpay_order_id: string;

  @Column(DataType.STRING)
  razorpay_payment_id: string;
}
