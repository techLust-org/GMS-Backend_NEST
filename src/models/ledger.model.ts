import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Backend-only cashflow log per shop.
@Table({ tableName: 'ledger', underscored: true })
export class Ledger extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.ENUM('credit', 'debit'), allowNull: false })
  type: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column(DataType.STRING(50))
  reference: string;

  @Column(DataType.UUID)
  reference_id: string;

  @Column(DataType.DATEONLY)
  entry_date: string;
}
