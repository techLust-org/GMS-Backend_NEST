import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

// Port of services/razorpay.service.js
@Injectable()
export class RazorpayService {
  private getRazorpay() {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(amount: number | string, currency = 'INR') {
    const instance = this.getRazorpay();
    return instance.orders.create({
      amount: Math.round(parseFloat(String(amount)) * 100), // paise
      currency,
      receipt: `rcpt_${Date.now()}`,
    });
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  async refund(paymentId: string, amount: number | string) {
    const instance = this.getRazorpay();
    return instance.payments.refund(paymentId, {
      amount: Math.round(parseFloat(String(amount)) * 100), // paise
    });
  }
}
