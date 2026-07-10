import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Transaction } from 'sequelize';
import { Ledger } from '../models';

interface RecordArgs {
  shopId: number | null;
  type: 'credit' | 'debit';
  amount: number | string;
  reference: string;
  referenceId: number;
  entryDate?: string;
  transaction?: Transaction;
}

interface RemoveArgs {
  shopId: number;
  reference: string;
  referenceId: number;
  transaction?: Transaction;
}

// Port of services/ledger.service.js
@Injectable()
export class LedgerService {
  constructor(@InjectModel(Ledger) private readonly ledger: typeof Ledger) {}

  async record({ shopId, type, amount, reference, referenceId, entryDate, transaction }: RecordArgs) {
    if (!shopId) return null;
    return this.ledger.create(
      {
        shop_id: shopId,
        type,
        amount,
        reference,
        reference_id: referenceId,
        entry_date: entryDate || new Date().toISOString().split('T')[0],
      } as any,
      transaction ? { transaction } : undefined,
    );
  }

  async removeByReference({ shopId, reference, referenceId, transaction }: RemoveArgs) {
    return this.ledger.destroy({
      where: { shop_id: shopId, reference, reference_id: referenceId },
      ...(transaction ? { transaction } : {}),
    });
  }

  async hasEntry({ shopId, reference, referenceId }: { shopId: number; reference: string; referenceId: number }) {
    const count = await this.ledger.count({
      where: { shop_id: shopId, reference, reference_id: referenceId },
    });
    return count > 0;
  }
}
