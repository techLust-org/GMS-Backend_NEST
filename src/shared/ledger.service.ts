import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Ledger } from '../models';

interface RecordArgs {
  shopId: string | null;
  type: 'credit' | 'debit';
  amount: number | string;
  reference: string;
  referenceId: string;
  entryDate?: string;
  session?: ClientSession;
}

interface RemoveArgs {
  shopId: string;
  reference: string;
  referenceId: string | string[];
  session?: ClientSession;
}

// Port of services/ledger.service.js
@Injectable()
export class LedgerService {
  constructor(@InjectModel(Ledger.name) private readonly ledger: Model<any>) {}

  async record({ shopId, type, amount, reference, referenceId, entryDate, session }: RecordArgs) {
    if (!shopId) return null;
    return new this.ledger({
      shop_id: shopId,
      type,
      amount,
      reference,
      reference_id: referenceId,
      entry_date: entryDate || new Date().toISOString().split('T')[0],
    }).save({ session });
  }

  async removeByReference({ shopId, reference, referenceId, session }: RemoveArgs) {
    const reference_id = Array.isArray(referenceId) ? { $in: referenceId } : referenceId;
    const { deletedCount } = await this.ledger
      .deleteMany({ shop_id: shopId, reference, reference_id })
      .session(session ?? null);
    return deletedCount;
  }

  async hasEntry({ shopId, reference, referenceId }: { shopId: string; reference: string; referenceId: string }) {
    const count = await this.ledger.countDocuments({
      shop_id: shopId, reference, reference_id: referenceId,
    });
    return count > 0;
  }
}
