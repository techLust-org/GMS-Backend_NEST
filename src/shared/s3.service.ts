import '../crypto-polyfill';
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { AppError } from '../common/app-error';

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Bucket layout: <shopId>/users/profiles/avatar_<uuid>.<ext> for trainers/members,
// <shopId>/shop/profiles/avatar_<uuid>.<ext> for the shop owner (admin).
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

  buildProfilePictureKey(shopId: string | null | undefined, role: string, contentType: string): string {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported image type. Use JPEG, PNG or WebP.', 400);
    const segment = role === 'admin' ? 'shop' : 'users';
    return `${shopId ?? 'platform'}/${segment}/profiles/avatar_${randomUUID()}.${ext}`;
  }

  buildShopLogoKey(shopId: string, contentType: string): string {
    const ext = ALLOWED_IMAGE_TYPES[contentType];
    if (!ext) throw new AppError('Unsupported image type. Use JPEG, PNG or WebP.', 400);
    return `${shopId}/owner/profiles/logo_${randomUUID()}.${ext}`;
  }

  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  async getViewUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
