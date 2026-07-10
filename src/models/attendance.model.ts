import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement } from 'sequelize-typescript';

@Table({ tableName: 'attendance', underscored: true })
export class Attendance extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  shop_id: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  member_id: number;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  attendance_date: string;

  @Column({ type: DataType.DATE, allowNull: false })
  check_in_time: Date;

  @Column(DataType.DATE)
  check_out_time: Date;
}
