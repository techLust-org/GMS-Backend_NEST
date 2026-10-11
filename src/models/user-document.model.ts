import { defineSchema, T } from './schema-helpers';

// Personal ID documents uploaded by members/trainers for the gym owner to
// verify. One row per upload — a rejected upload is replaced by a fresh row
// rather than mutated, so the review history stays intact.
export const UserDocumentSchema = defineSchema('user_documents', {
  shop_id: T.uuid({ required: true }),
  user_id: T.uuid({ required: true }),
  file_key: T.text({ required: true }),
  // Heavily downscaled + blurred derivative of the original, generated
  // server-side right after upload. Null for PDFs (no preview is rendered
  // for those) or if generation failed — the admin UI falls back to a
  // generic document icon in either case. Never contains legible content.
  preview_key: T.text(),
  content_type: T.string({ required: true }),
  original_filename: T.string(),
  status: T.enumOf(['pending', 'verified', 'rejected'], { required: true, default: 'pending' }),
  reviewed_by: T.uuid(),
  reviewed_at: T.date(),
  rejection_reason: T.text(),
});
UserDocumentSchema.index({ shop_id: 1, status: 1 });
UserDocumentSchema.index({ user_id: 1 });

export const UserDocument = { name: 'UserDocument', schema: UserDocumentSchema };
