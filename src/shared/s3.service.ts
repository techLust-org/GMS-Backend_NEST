import '../crypto-polyfill';
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppError } from '../common/app-error';

// Presigned PUT URLs for ID documents require this exact header on the
// client's upload request (it's baked into the SigV4 signature) so the
// object lands in S3 already SSE-encrypted at rest.
export const DOCUMENT_SSE_HEADER = 'AES256';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

// Bucket layout: <shopId>/users/<userId>/profiles/avatar_<uuid>.<ext> for a
// member/trainer's profile picture, <shopId>/owner/profiles/avatar_<uuid>.<ext>
// for the shop owner's own profile picture, and <shopId>/owner/profiles/
// logo_<uuid>.<ext> / cover_<uuid>.<ext> for the shop's branding images
// (there's only ever one owner per shop, so those don't need a per-user
// folder). <shopId>/users/<userId>/documents/<uuid>.<ext> for ID documents.
@Injectable()
export class S3Service {
  // WHEN_REQUIRED skips the SDK's default flexible-checksum middleware, which
  // needs the global Web Crypto API (getRandomValues) — unavailable on our
  // Node 16 runtime and otherwise crashes presigning with a TypeError.
  private readonly client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  private readonly bucket = process.env.AWS_BUCKET_NAME;

  buildProfilePictureKey(shopId: string | null | undefined, userId: string, role: string, contentType: string): string {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported image type. Use JPEG, PNG or WebP.', 400);
    const segment = role === 'admin' ? 'owner' : `users/${userId}`;
    return `${shopId ?? 'platform'}/${segment}/profiles/avatar_${randomUUID()}.${ext}`;
  }

  buildShopLogoKey(shopId: string, contentType: string): string {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported image type. Use JPEG, PNG or WebP.', 400);
    return `${shopId}/owner/profiles/logo_${randomUUID()}.${ext}`;
  }

  buildShopCoverImageKey(shopId: string, contentType: string): string {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported image type. Use JPEG, PNG or WebP.', 400);
    return `${shopId}/owner/profiles/cover_${randomUUID()}.${ext}`;
  }

  // Personal ID documents uploaded by members/trainers for owner verification.
  buildUserDocumentKey(shopId: string, userId: string, contentType: string): string {
    const ext = ALLOWED_DOCUMENT_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported file type. Use PDF, JPEG or PNG.', 400);
    return `${shopId}/users/${userId}/documents/${randomUUID()}.${ext}`;
  }

  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  // ID documents are encrypted at rest — the client's PUT must send the
  // matching `x-amz-server-side-encryption: AES256` header (see
  // DOCUMENT_SSE_HEADER) or the signature won't match.
  async getDocumentUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: DOCUMENT_SSE_HEADER,
    });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  async getViewUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // Server-side fetch of an object's raw bytes — used to generate the masked
  // preview of a freshly-uploaded ID document without ever handing the
  // original to the client for that purpose.
  async getObjectBuffer(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const stream = res.Body as unknown as AsyncIterable<Uint8Array>;
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  // Server-side upload (as opposed to a client presigned PUT) — used for
  // generated artifacts like the masked document preview. Encrypted at rest
  // for the same reason the original is.
  async putObjectBuffer(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: DOCUMENT_SSE_HEADER,
    }));
  }
}
