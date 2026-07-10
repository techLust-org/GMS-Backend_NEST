import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'notifications', underscored: true })
export class Notification extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.INTEGER)
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  user_id: number;

  @Column({
    type: DataType.ENUM(
      'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
      'trainer_absence', 'gym_announcement', 'subscription_purchased',
      'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
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

  @Column(DataType.INTEGER)
  related_id: number;
}
