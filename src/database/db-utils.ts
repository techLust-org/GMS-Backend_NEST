import { ClientSession, Connection } from 'mongoose';

// Runs `fn` inside a MongoDB transaction, committing on success and aborting
// on any thrown error (which is rethrown). Transient write conflicts — e.g.
// two concurrent requests touching the same subscription/product document,
// which Postgres serialized with SELECT ... FOR UPDATE — are retried, and
// Mongoose resets the state of documents saved in a failed attempt.
export async function withTransaction<T>(
  connection: Connection,
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> {
  let result: T;
  await connection.transaction(async (session) => {
    result = await fn(session);
  });
  return result!;
}

// Duplicate-key error from a unique index (the Mongo equivalent of
// SequelizeUniqueConstraintError).
export function isUniqueViolation(err: any): boolean {
  return err?.code === 11000 || err?.cause?.code === 11000;
}

// Case-insensitive substring match — the old `Op.iLike: '%term%'`.
export function iLike(term: string) {
  return { $regex: String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
}
