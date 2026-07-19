import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// One row per referred shop. status flips pending -> successful the moment
// the referred shop activates its first-ever platform subscription.
// redeemed_at marks this referral as already spent toward a past reward
// redemption, so it's excluded from future eligibility counts.
@Table({ tableName: 'referrals', underscored: true })
export class Referral extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  referrer_shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  referred_shop_id: string;

  @Column({ type: DataType.ENUM('pending', 'successful'), allowNull: false, defaultValue: 'pending' })
  status: string;

  @Column(DataType.DATE)
  converted_at: Date;

  @Column(DataType.DATE)
  redeemed_at: Date;
}
