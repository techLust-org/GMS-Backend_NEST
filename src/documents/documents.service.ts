import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import sharp from 'sharp';
import { User, Shop, UserDocument, DocumentAccessLog } from '../models';
import { S3Service } from '../shared/s3.service';
import { NotificationService } from '../shared/notification.service';
import { AppError } from '../common/app-error';
import { ApiPayload } from '../common/api-payload';
import { withTransaction } from '../database/db-utils';

// Signed URL to the ORIGINAL file is only ever minted by viewOriginal(),
// one-at-a-time, short-lived, and audit-logged. Every other read path
// (the admin review list) resolves to the masked preview instead.
const ORIGINAL_VIEW_EXPIRY_SECONDS = 45;
const PREVIEW_VIEW_EXPIRY_SECONDS = 600;
const PREVIEW_WIDTH_PX = 480;
const PREVIEW_BLUR_SIGMA = 22;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(UserDocument.name) private readonly userDocument: Model<any>,
    @InjectModel(DocumentAccessLog.name) private readonly accessLog: Model<any>,
    @InjectModel(User.name) private readonly user: Model<any>,
    @InjectModel(Shop.name) private readonly shop: Model<any>,
    @InjectConnection() private readonly connection: Connection,
    private readonly s3: S3Service,
    private readonly notificationService: NotificationService,
  ) {}

  private previewKeyFor(fileKey: string): string {
    return fileKey.replace(/\.[^./]+$/, '') + '_preview.jpg';
  }

  // Downscales + heavily blurs the original into a preview where no text or
  // fine detail survives — just enough left to tell "this is a document
  // photo" in a list. Images only; PDFs get no preview (the admin list falls
  // back to a generic file icon, which already reveals nothing). Best-effort:
  // failures never block the upload itself.
  private async generatePreview(doc: any): Promise<void> {
    if (!['image/jpeg', 'image/png'].includes(doc.content_type)) return;
    try {
      const original = await this.s3.getObjectBuffer(doc.file_key);
      const preview = await sharp(original)
        .resize({ width: PREVIEW_WIDTH_PX, withoutEnlargement: true })
        .blur(PREVIEW_BLUR_SIGMA)
        .jpeg({ quality: 40 })
        .toBuffer();
      const previewKey = this.previewKeyFor(doc.file_key);
      await this.s3.putObjectBuffer(previewKey, preview, 'image/jpeg');
      await doc.set({ preview_key: previewKey }).save();
    } catch (err) {
      this.logger.warn(`Preview generation failed for document ${doc.id}: ${err}`);
    }
  }

  // ---------------- Self-service (member/trainer) ----------------

  async presign(userId: string, shopId: string, body: any) {
    const { contentType } = body;
    if (!contentType) throw new AppError('contentType required', 400);
    const key = this.s3.buildUserDocumentKey(shopId, userId, contentType);
    const uploadUrl = await this.s3.getDocumentUploadUrl(key, contentType);
    return new ApiPayload({ uploadUrl, key }, 'Upload URL generated');
  }

  async confirm(userId: string, shopId: string, body: any) {
    const { key, contentType, originalFilename } = body;
    if (!key || !contentType) throw new AppError('key and contentType required', 400);
    const expectedPrefix = `${shopId}/users/${userId}/documents/`;
    if (!key.startsWith(expectedPrefix)) throw new AppError('Invalid object key', 400);

    const doc: any = await this.userDocument.create({
      shop_id: shopId,
      user_id: userId,
      file_key: key,
      content_type: contentType,
      original_filename: originalFilename || null,
      status: 'pending',
    });

    await this.generatePreview(doc);

    try {
      const shopRow: any = await this.shop.findById(shopId).select('owner_id');
      const uploader: any = await this.user.findById(userId).select('first_name last_name');
      if (shopRow?.owner_id) {
        await this.notificationService.createNotification({
          userId: shopRow.owner_id,
          shopId,
          type: 'document_uploaded',
          title: 'ID document uploaded',
          message: `${uploader?.first_name ?? 'A member'} ${uploader?.last_name ?? ''}`.trim()
            + ' uploaded an ID document for verification.',
          relatedId: doc.id,
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to notify owner of document upload: ${err}`);
    }

    // The uploader gets their own signed URL back — it's their own document.
    const fileUrl = await this.s3.getViewUrl(doc.file_key);
    return new ApiPayload({ ...doc.toJSON(), fileUrl }, 'Document submitted for verification');
  }

  async listMine(userId: string) {
    const docs = await this.userDocument.find({ user_id: userId }).sort({ createdAt: -1 });
    const withUrls = await Promise.all(docs.map(async (d: any) => ({
      ...d.toJSON(),
      fileUrl: await this.s3.getViewUrl(d.file_key),
    })));
    return new ApiPayload(withUrls, 'Documents fetched');
  }

  async removeMine(userId: string, id: string) {
    const doc: any = await this.userDocument.findOne({ _id: id, user_id: userId });
    if (!doc) throw new AppError('Document not found', 404);
    if (doc.status === 'verified') throw new AppError('A verified document cannot be deleted', 400);

    const { file_key, preview_key } = doc;
    // Its access-log rows went with it via ON DELETE CASCADE.
    await withTransaction(this.connection, async (session) => {
      await this.accessLog.deleteMany({ document_id: doc.id }, { session });
      await doc.deleteOne({ session });
    });
    this.s3.deleteObject(file_key).catch(() => {});
    if (preview_key) this.s3.deleteObject(preview_key).catch(() => {});

    return new ApiPayload(null, 'Document removed');
  }

  // ---------------- Admin review ----------------

  // Masked previews only — the original file_key is never resolved here.
  async listForShop(shopId: string, query: any) {
    const { status = 'pending', userId, page = 1, limit = 20 } = query;
    const where: any = { shop_id: shopId };
    if (status && status !== 'all') where.status = status;
    if (userId) where.user_id = userId;

    const offset = (page - 1) * limit;
    const [count, rows] = await Promise.all([
      this.userDocument.countDocuments(where),
      this.userDocument
        .find(where)
        .populate({
          path: 'user',
          select: 'first_name last_name email role_id',
          populate: { path: 'Role', select: 'name -_id' },
        })
        .sort({ createdAt: 1 })
        .skip(parseInt(String(offset), 10))
        .limit(parseInt(limit)),
    ]);

    const withPreviews = await Promise.all(rows.map(async (d: any) => {
      const plain = d.toJSON();
      // role_id is only loaded to resolve the user's Role.
      if (plain.user) delete plain.user.role_id;
      plain.previewUrl = plain.preview_key
        ? await this.s3.getViewUrl(plain.preview_key, PREVIEW_VIEW_EXPIRY_SECONDS)
        : null;
      delete plain.file_key;
      delete plain.preview_key;
      return plain;
    }));

    return new ApiPayload(withPreviews, 'Documents fetched', { total: count, page: +page, limit: +limit });
  }

  // The only path that ever resolves the original. Audit-logged, short-lived.
  async viewOriginal(adminId: string, shopId: string, id: string, ipAddress: string | null) {
    const doc: any = await this.userDocument.findOne({ _id: id, shop_id: shopId });
    if (!doc) throw new AppError('Document not found', 404);

    await this.accessLog.create({
      document_id: doc.id,
      shop_id: shopId,
      viewed_by: adminId,
      ip_address: ipAddress,
    });

    const url = await this.s3.getViewUrl(doc.file_key, ORIGINAL_VIEW_EXPIRY_SECONDS);
    return new ApiPayload({ url, expiresIn: ORIGINAL_VIEW_EXPIRY_SECONDS }, 'Signed URL generated');
  }

  async review(adminId: string, shopId: string, id: string, status: 'verified' | 'rejected', reason?: string) {
    const doc: any = await this.userDocument.findOne({ _id: id, shop_id: shopId });
    if (!doc) throw new AppError('Document not found', 404);
    if (doc.status !== 'pending') throw new AppError('Document already reviewed', 400);

    await doc.set({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date(),
      rejection_reason: status === 'rejected' ? (reason || null) : null,
    }).save();

    const title = status === 'verified' ? 'ID document verified' : 'ID document rejected';
    const message = status === 'verified'
      ? 'Your uploaded ID document has been verified by the gym.'
      : `Your uploaded ID document was rejected.${reason ? ` Reason: ${reason}` : ''} Please upload a new one.`;
    this.notificationService.createNotification({
      userId: doc.user_id,
      shopId,
      type: status === 'verified' ? 'document_verified' : 'document_rejected',
      title,
      message,
      relatedId: doc.id,
    }).catch((err) => this.logger.warn(`Failed to notify member of document review: ${err}`));

    const plain = doc.toJSON();
    delete plain.file_key;
    delete plain.preview_key;
    return new ApiPayload(plain, title);
  }
}
