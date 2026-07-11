import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  private getTransporter() {
    if (!process.env.SMTP_HOST) return null;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: parseInt(process.env.SMTP_PORT, 10) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  // Returns whether the email actually went out — callers should degrade
  // gracefully (e.g. show the value on-screen) rather than fail the request
  // when SMTP isn't configured or delivery fails.
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(`SMTP not configured — skipping email to ${to}: "${subject}"`);
      return false;
    }
    try {
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      return false;
    }
  }

  async sendOwnerWelcomeEmail(
    to: string,
    ownerName: string,
    shopName: string,
    tempPassword: string,
  ): Promise<boolean> {
    const loginUrl = process.env.FRONTEND_URL || '';
    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to GymMan, ${ownerName}!</h2>
        <p>An account has been created for <strong>${shopName}</strong> on the GymMan platform.</p>
        <p>You can sign in with the credentials below:</p>
        <table style="margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td><strong>${to}</strong></td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Temporary password</td><td><strong>${tempPassword}</strong></td></tr>
        </table>
        <p>Please sign in and change your password as soon as possible.</p>
        ${loginUrl ? `<p><a href="${loginUrl}">${loginUrl}</a></p>` : ''}
      </div>
    `;
    return this.sendMail(to, `Your GymMan account for ${shopName} is ready`, html);
  }
}
