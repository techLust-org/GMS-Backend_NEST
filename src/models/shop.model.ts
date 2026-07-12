import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'shops', underscored: true })
export class Shop extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.STRING(150), allowNull: false })
  name: string;

  @Column({ type: DataType.UUID, allowNull: false })
  owner_id: string;

  @Column(DataType.STRING(20))
  phone: string;

  @Column(DataType.STRING(255))
  email: string;

  @Column(DataType.TEXT)
  address: string;

  @Column(DataType.TEXT)
  logo_url: string;

  @Column(DataType.TEXT)
  cover_image_url: string;

  @Column(DataType.STRING(7))
  theme_color: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_active: boolean;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  is_closed: boolean;
}
