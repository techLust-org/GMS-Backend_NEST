import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

// Backend-only cashflow log per shop.
@Table({ tableName: 'ledger', underscored: true })
export class Ledger extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.ENUM('credit', 'debit'), allowNull: false })
  type: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  amount: number;

  @Column(DataType.STRING(50))
  reference: string;

  @Column(DataType.INTEGER)
  reference_id: number;

  @Column(DataType.DATEONLY)
  entry_date: string;
}
