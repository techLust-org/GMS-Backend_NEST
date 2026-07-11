import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'attendance', underscored: true })
export class Attendance extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  member_id: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  attendance_date: string;

  @Column({ type: DataType.DATE, allowNull: false })
  check_in_time: Date;

  @Column(DataType.DATE)
  check_out_time: Date;
}
