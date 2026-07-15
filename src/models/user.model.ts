import {
  Table, Column, Model, DataType, PrimaryKey, Default, DefaultScope, Scopes,
} from 'sequelize-typescript';

@DefaultScope(() => ({ attributes: { exclude: ['password_hash'] } }))
@Scopes(() => ({ withPassword: { attributes: { exclude: [] as string[] } } }))
@Table({ tableName: 'users', underscored: true })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  role_id: string;

  @Column(DataType.UUID)
  shop_id: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  first_name: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  last_name: string;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  email: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  password_hash: string;

  @Column(DataType.STRING(20))
  phone: string;

  @Column(DataType.DATEONLY)
  date_of_birth: string;

  @Column(DataType.ENUM('male', 'female', 'other'))
  gender: string;

  @Column(DataType.TEXT)
  profile_pic: string;

  @Column({ type: DataType.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' })
  status: string;

  @Column(DataType.DATEONLY)
  hire_date: string;

  @Column(DataType.DECIMAL(10, 2))
  salary: number;

  @Column(DataType.STRING(100))
  emergency_contact: string;

  @Column(DataType.STRING(150))
  specialization: string;

  @Column(DataType.TEXT)
  bio: string;

  @Column(DataType.TEXT)
  govt_id_url: string;

  @Column(DataType.TEXT)
  fcm_token: string;

  @Column(DataType.STRING)
  google_id: string;

  // Set when the account owner self-deletes via /auth/delete-account.
  // Personal fields get anonymized at the same time — this timestamp is
  // just the audit marker of when that happened.
  @Column(DataType.DATE)
  deleted_at: Date;
}
