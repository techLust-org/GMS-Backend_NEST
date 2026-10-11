import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DEFAULT_MONGO_URI } from '../database/database.module';

@Injectable()
export class DbBackupCronService {
  private readonly logger = new Logger('DbBackup');

  private readonly s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });

  private readonly bucket = process.env.AWS_BUCKET_NAME;

  // Database name from MONGO_URI's path (mongodb://host/<db>?...), the same
  // one the app connects to; MONGO_DB_NAME overrides it.
  private databaseName(): string {
    if (process.env.MONGO_DB_NAME) return process.env.MONGO_DB_NAME;
    const uri = process.env.MONGO_URI || DEFAULT_MONGO_URI;
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : 'gym_management';
  }

  // Every day at 1:00 AM
  @Cron('0 1 * * *')
  async handleDatabaseBackup() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const timestamp = `${dd}_${mm}_${yy}`;

    const fileName = `gymaxis_${timestamp}.archive.gz`;
    const tmpFile = join(tmpdir(), fileName);

    try {
      const container = process.env.MONGO_CONTAINER || 'gym_mongo';
      const dbName = this.databaseName();

      this.logger.log(`Starting database backup: ${fileName}`);

      // mongodump runs inside the Mongo container (which ships the database
      // tools), streaming a gzipped archive of the whole database to stdout.
      execSync(
        `docker exec ${container} mongodump --quiet --db=${dbName} --archive --gzip > ${tmpFile}`,
        { stdio: 'pipe' },
      );

      const fileBuffer = readFileSync(tmpFile);
      if (fileBuffer.length <= 20) {
        throw new Error('mongodump produced empty output — check that the database exists and the container is running');
      }
      const s3Key = `db/backups/${fileName}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: 'application/gzip',
          ServerSideEncryption: 'AES256',
        }),
      );

      this.logger.log(`Backup uploaded to s3://${this.bucket}/${s3Key}`);
    } catch (err) {
      this.logger.error('Database backup failed', err instanceof Error ? err.stack : err);
    } finally {
      try {
        unlinkSync(tmpFile);
      } catch {
        // tmp file may not exist if mongodump failed
      }
    }
  }
}
