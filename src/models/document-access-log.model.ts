import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

// Immutable audit trail: one row every time an admin resolves a short-lived
// signed URL to an ID document's ORIGINAL (unmasked) file. The document list
// itself only ever serves masked previews — this table is the record of who
// actually saw the real thing, and when.
@Table({ tableName: 'document_access_logs', underscored: true, updatedAt: false })
export class DocumentAccessLog extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  document_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  shop_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  viewed_by: string;

  @Column(DataType.STRING(64))
  ip_address: string;
}
