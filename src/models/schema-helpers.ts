import mongoose, { Schema, SchemaDefinition, SchemaOptions } from 'mongoose';
import { randomUUID } from 'crypto';

// Shared building blocks that keep the Mongo documents shaped exactly like
// the old Postgres rows did over the API:
//  - `_id` is a UUID string, exposed as `id` (FK columns stay UUID strings)
//  - DECIMAL(10,2) columns read back as fixed-point strings ("1500.00"),
//    the way pg returned NUMERIC
//  - DATEONLY columns are stored and returned as 'YYYY-MM-DD' strings,
//    TIME columns as 'HH:MM:SS'
//  - every column not set is stored as null (like a SQL NULL column), so
//    JSON responses keep the same keys
//  - createdAt / updatedAt timestamps, same names Sequelize emitted

// `required` means NOT NULL, as in SQL: an empty string is still a value.
// (Mongoose's default String check also rejects ''.)
mongoose.Schema.Types.String.checkRequired((v: any) => v != null);

const pad = (n: number) => String(n).padStart(2, '0');

// Mirrors Sequelize's DATEONLY coercion: a Date (or full timestamp string)
// becomes its local calendar date; a 'YYYY-MM-DD...' string keeps its date
// part. Also applied to query filters, so `{ end_date: { $gte: new Date() } }`
// compares as a date, not as a string-vs-Date mismatch.
export function toDateOnly(v: any): any {
  if (v == null || v === '') return v === '' ? null : v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !v.includes('T')) return v.slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Mirrors a pg TIME column: '7:00' / '07:00' / '7:00 pm' are stored and
// returned as 'HH:MM:SS'. Anything else fails validation, as pg rejected it.
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*([ap]\.?m\.?)?$/i;
function toTime(v: any): any {
  if (v == null || v === '') return v === '' ? null : v;
  const m = TIME_RE.exec(String(v).trim());
  if (!m) return v;
  let hours = Number(m[1]);
  const meridiem = m[4]?.[0].toLowerCase();
  if (meridiem === 'p' && hours < 12) hours += 12;
  if (meridiem === 'a' && hours === 12) hours = 0;
  return `${pad(hours)}:${m[2]}:${m[3] ? m[3].padStart(2, '0') : '00'}`;
}

const roundCents = (v: any) => {
  if (v == null || v === '') return v === '' ? null : v;
  const n = Number(v);
  return Number.isNaN(n) ? v : Math.round(n * 100) / 100;
};
const fixed2 = (v: any) => (v == null ? v : Number(v).toFixed(2));

interface ColOpts {
  required?: boolean;
  default?: any;
  enum?: string[];
  select?: boolean;
}

const col = (type: any, o: ColOpts = {}, extra: Record<string, any> = {}) => ({
  type,
  required: o.required || false,
  default: o.default !== undefined ? o.default : null,
  ...(o.enum ? { enum: [...o.enum, null] } : {}),
  ...(o.select === false ? { select: false } : {}),
  ...extra,
});

export const T = {
  uuid: (o?: ColOpts) => col(String, o),
  string: (o?: ColOpts) => col(String, o),
  text: (o?: ColOpts) => col(String, o),
  int: (o?: ColOpts) => col(Number, o),
  bool: (o?: ColOpts) => col(Boolean, o),
  date: (o?: ColOpts) => col(Date, o),
  json: (o?: ColOpts) => col(Schema.Types.Mixed, o),
  enumOf: (values: string[], o: ColOpts = {}) => col(String, { ...o, enum: values }),
  decimal: (o?: ColOpts) => col(Number, o, { set: roundCents, get: fixed2 }),
  dateOnly: (o?: ColOpts) => col(String, o, { set: toDateOnly }),
  time: (o?: ColOpts) => col(String, o, {
    set: toTime,
    validate: { validator: (v: any) => v == null || /^\d{2}:\d{2}:\d{2}/.test(v), message: 'invalid time' },
  }),
};

// Current local date as 'YYYY-MM-DD' — DataType.NOW default for DATEONLY.
export const todayDateOnly = () => toDateOnly(new Date());

export function defineSchema(
  collection: string,
  fields: SchemaDefinition,
  opts: { updatedAt?: boolean } = {},
): Schema {
  const schema = new Schema(
    {
      _id: { type: String, default: () => randomUUID() },
      ...fields,
    },
    {
      collection,
      versionKey: false,
      timestamps: opts.updatedAt === false ? { createdAt: true, updatedAt: false } : true,
      id: true,
      strict: true,
    } as SchemaOptions,
  );

  const transform = (_doc: any, ret: any) => {
    const out: any = {};
    if (ret._id !== undefined) out.id = ret._id;
    for (const [k, v] of Object.entries(ret)) {
      if (k === '_id' || k === 'id') continue;
      if (v === undefined) continue;
      out[k] = v;
    }
    return out;
  };
  schema.set('toJSON', { getters: true, virtuals: true, versionKey: false, transform });
  schema.set('toObject', { getters: true, virtuals: true, versionKey: false, transform });
  return schema;
}

// Association helpers — virtual populates named exactly like the old
// Sequelize include aliases, so nested JSON keys are unchanged.
export function belongsTo(schema: Schema, as: string, ref: string, localField: string) {
  schema.virtual(as, { ref, localField, foreignField: '_id', justOne: true });
}

export function hasOne(schema: Schema, as: string, ref: string, foreignField: string) {
  schema.virtual(as, { ref, localField: '_id', foreignField, justOne: true });
}

export function hasMany(schema: Schema, as: string, ref: string, foreignField: string) {
  schema.virtual(as, { ref, localField: '_id', foreignField, justOne: false });
}
