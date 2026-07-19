import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'notifications', underscored: true })
export class Notification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.UUID)
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string;

  @Column({
    type: DataType.ENUM(
      'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
      'trainer_absence', 'gym_announcement', 'subscription_purchased',
      'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
      'document_uploaded', 'document_verified', 'document_rejected',
    ),
    allowNull: false,
  })
  type: string;

  @Column({ type: DataType.STRING(200), allowNull: false })
  title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  message: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  is_read: boolean;

  @Column(DataType.UUID)
  related_id: string;
}
