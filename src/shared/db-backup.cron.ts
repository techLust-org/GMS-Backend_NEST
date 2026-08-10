import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import { unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

  // Every day at 1:00 AM
  @Cron('0 1 * * *')
  async handleDatabaseBackup() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const timestamp = `${dd}_${mm}_${yy}`;

    const fileName = `gymaxis_${timestamp}.sql.gz`;
    const tmpFile = join(tmpdir(), fileName);

    try {
      const user = process.env.DB_USER || 'postgres';
      const dbName = process.env.DB_NAME || 'gym_management';

      this.logger.log(`Starting database backup: ${fileName}`);

      execSync(
        `docker exec gym_postgres pg_dump -U ${user} -d ${dbName} | gzip > ${tmpFile}`,
        { stdio: 'pipe' },
      );

      const fileBuffer = readFileSync(tmpFile);
      if (fileBuffer.length <= 20) {
        throw new Error('pg_dump produced empty output — check that the database exists and the container is running');
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
        // tmp file may not exist if pg_dump failed
      }
    }
  }
}
