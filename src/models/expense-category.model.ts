import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'expense_categories', underscored: true })
export class ExpenseCategory extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  name: string;

  @Column({ type: DataType.ENUM('credit', 'debit'), allowNull: false, defaultValue: 'debit' })
  type: string;
}
