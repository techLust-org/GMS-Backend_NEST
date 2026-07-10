import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'products', underscored: true })
export class Product extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  cost_price: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  discount: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false, defaultValue: 0 })
  sell_price: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  stock_qty: number;

  @Column(DataType.STRING(100))
  category: string;

  @Column({ type: DataType.STRING(100), unique: true })
  sku: string;

  @Column(DataType.TEXT)
  photo_url: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: true })
  is_active: boolean;

  @Column({ type: DataType.INTEGER, defaultValue: 5 })
  low_stock_threshold: number;
}
