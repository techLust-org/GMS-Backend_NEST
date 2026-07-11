import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'expenses', underscored: true })
export class Expense extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  category_id: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  description: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column(DataType.DATEONLY)
  expense_date: string;

  @Column(DataType.STRING(150))
  paid_to: string;

  @Column(DataType.UUID)
  trainer_id: string;

  @Column(DataType.TEXT)
  invoice_url: string;

  @Column(DataType.UUID)
  product_sale_id: string;
}
