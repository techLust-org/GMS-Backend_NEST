import { defineSchema, T } from './schema-helpers';

export const AttendanceSchema = defineSchema('attendance', {
  shop_id: T.uuid({ required: true }),
  member_id: T.uuid({ required: true }),
  attendance_date: T.dateOnly({ required: true }),
  check_in_time: T.date({ required: true }),
  check_out_time: T.date(),
});
AttendanceSchema.index({ member_id: 1, attendance_date: 1 }, { unique: true });
AttendanceSchema.index({ attendance_date: 1 });
AttendanceSchema.index({ shop_id: 1 });

export const Attendance = { name: 'Attendance', schema: AttendanceSchema };
