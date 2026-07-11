import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'payments', underscored: true })
export class Payment extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  member_id: string;

  @Column(DataType.UUID)
  subscription_id: string;

  @Column(DataType.UUID)
  product_sale_id: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.DATEONLY, defaultValue: DataType.NOW })
  payment_date: string;

  @Column({ type: DataType.STRING(50), defaultValue: 'cash' })
  payment_method: string;

  @Column(DataType.TEXT)
  notes: string;
}
