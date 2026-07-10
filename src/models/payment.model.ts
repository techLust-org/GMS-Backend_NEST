import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'payments', underscored: true })
export class Payment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  member_id: number;

  @Column(DataType.INTEGER)
  subscription_id: number;

  @Column(DataType.INTEGER)
  product_sale_id: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column({ type: DataType.DATEONLY, defaultValue: DataType.NOW })
  payment_date: string;

  @Column({ type: DataType.STRING(50), defaultValue: 'cash' })
  payment_method: string;

  @Column(DataType.TEXT)
  notes: string;
}
