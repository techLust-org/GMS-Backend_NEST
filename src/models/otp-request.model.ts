import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// A short-lived, single-use OTP sent to a phone number over WhatsApp —
// purely proves "this phone number answered a code sent to it"; it carries
// no notion of login vs. registration. The caller (AuthService /
// PublicShopsService) decides what to do once verifyAndConsume succeeds.
@Table({ tableName: 'otp_requests', underscored: true })
export class OtpRequest extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  phone: string;

  @Column({ type: DataType.STRING, allowNull: false })
  code_hash: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  attempts: number;

  @Column({ type: DataType.DATE, allowNull: false })
  expires_at: Date;

  @Column(DataType.DATE)
  consumed_at: Date;
}
