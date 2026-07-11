import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'product_sales', underscored: true })
export class ProductSale extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  product_id: string;

  @Column(DataType.UUID)
  member_id: string;

  @Column({ type: DataType.INTEGER, defaultValue: 1 })
  quantity: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  unit_price: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  total_price: number;

  @Column({ type: DataType.ENUM('offline', 'online'), defaultValue: 'offline' })
  order_mode: string;

  @Column({ type: DataType.ENUM('cash', 'upi', 'card', 'razorpay'), defaultValue: 'cash' })
  payment_mode: string;

  @Column(DataType.STRING)
  transaction_id: string;

  @Column(DataType.STRING)
  order_id: string;

  @Column(DataType.UUID)
  sold_by: string;

  @Column(DataType.DATEONLY)
  sale_date: string;

  @Column({
    type: DataType.ENUM('pending', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;
}
