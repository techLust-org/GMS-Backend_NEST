import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Server-resolved record of what a Razorpay order was actually created for.
// The confirm step (purchase/activate) must read the grant details back
// from here — never re-trust a client-resubmitted planId/items/amount at
// that point, since the payment signature alone doesn't prove they match
// what was paid for.
@Table({ tableName: 'pending_payments', underscored: true })
export class PendingPayment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column(DataType.UUID)
  user_id: string;

  @Column({ type: DataType.STRING(30), allowNull: false })
  kind: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  razorpay_order_id: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.JSONB, allowNull: false })
  payload: object;

  @Column(DataType.DATE)
  consumed_at: Date;
}
