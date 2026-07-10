import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'expenses', underscored: true })
export class Expense extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  category_id: number;

  @Column({ type: DataType.STRING(255), allowNull: false })
  description: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column(DataType.DATEONLY)
  expense_date: string;

  @Column(DataType.STRING(150))
  paid_to: string;

  @Column(DataType.INTEGER)
  trainer_id: number;

  @Column(DataType.TEXT)
  invoice_url: string;

  @Column(DataType.INTEGER)
  product_sale_id: number;
}
