import { defineSchema, T } from './schema-helpers';

// Immutable audit trail: one row every time an admin resolves a short-lived
// signed URL to an ID document's ORIGINAL (unmasked) file. The document list
// itself only ever serves masked previews — this collection is the record of
// who actually saw the real thing, and when.
export const DocumentAccessLogSchema = defineSchema(
  'document_access_logs',
  {
    document_id: T.uuid({ required: true }),
    shop_id: T.uuid({ required: true }),
    viewed_by: T.uuid({ required: true }),
    ip_address: T.string(),
  },
  { updatedAt: false },
);
DocumentAccessLogSchema.index({ document_id: 1 });

export const DocumentAccessLog = { name: 'DocumentAccessLog', schema: DocumentAccessLogSchema };
