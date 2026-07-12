import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

// Sends OTP codes via the Meta WhatsApp Cloud API. WhatsApp requires
// outbound-initiated messages (no prior conversation open) to use a
// pre-approved "Authentication" message template — you can't just send
// free text. WHATSAPP_OTP_TEMPLATE_NAME must match a template you've
// created and had approved in Meta Business Manager > WhatsApp Manager.
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger('WhatsApp');

  private isConfigured(): boolean {
    return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  }

  // Returns whether the message actually went out — callers should degrade
  // gracefully (e.g. return the code directly in non-production responses
  // for local testing) rather than fail the request when WhatsApp isn't
  // configured or delivery fails, same pattern as MailService.
  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn(`WhatsApp not configured — OTP for ${phone}: ${code}`);
      return false;
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_verification';
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    try {
      await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: templateName,
            language: { code: 'en_US' },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: code }] },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (err: any) {
      this.logger.error(
        `Failed to send WhatsApp OTP to ${phone}: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`,
      );
      return false;
    }
  }
}
