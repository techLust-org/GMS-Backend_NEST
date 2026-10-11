import { defineSchema, T } from './schema-helpers';

export const NotificationSchema = defineSchema('notifications', {
  shop_id: T.uuid(),
  user_id: T.uuid({ required: true }),
  type: T.enumOf(
    [
      'subscription_expiry', 'trainer_assigned', 'trainer_unassigned',
      'trainer_absence', 'gym_announcement', 'subscription_purchased',
      'order_placed', 'order_shipped', 'order_delivered', 'order_cancelled',
      'role_promotion',
      'document_uploaded', 'document_verified', 'document_rejected',
    ],
    { required: true },
  ),
  title: T.string({ required: true }),
  message: T.text({ required: true }),
  is_read: T.bool({ default: false }),
  related_id: T.uuid(),
});
NotificationSchema.index({ user_id: 1, is_read: 1 });
NotificationSchema.index({ user_id: 1, createdAt: -1 });

export const Notification = { name: 'Notification', schema: NotificationSchema };
