import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Personal ID documents uploaded by members/trainers for the gym owner to
// verify. One row per upload — a rejected upload is replaced by a fresh row
// rather than mutated, so the review history stays intact.
@Table({ tableName: 'user_documents', underscored: true })
export class UserDocument extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  user_id: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  file_key: string;

  // Heavily downscaled + blurred derivative of the original, generated
  // server-side right after upload. Null for PDFs (no preview is rendered
  // for those) or if generation failed — the admin UI falls back to a
  // generic document icon in either case. Never contains legible content.
  @Column(DataType.TEXT)
  preview_key: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  content_type: string;

  @Column(DataType.STRING(255))
  original_filename: string;

  @Column({
    type: DataType.ENUM('pending', 'verified', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  })
  status: string;

  @Column(DataType.UUID)
  reviewed_by: string;

  @Column(DataType.DATE)
  reviewed_at: Date;

  @Column(DataType.TEXT)
  rejection_reason: string;
}
