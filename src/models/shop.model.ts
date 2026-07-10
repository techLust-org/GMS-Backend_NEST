import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'shops', underscored: true })
export class Shop extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  owner_id: number;

  @Column(DataType.STRING(20))
  phone: string;

  @Column(DataType.STRING(255))
  email: string;

  @Column(DataType.TEXT)
  address: string;

  @Column(DataType.TEXT)
  logo_url: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_active: boolean;
}
