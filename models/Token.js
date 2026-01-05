import mongoose from 'mongoose';
const { Schema } = mongoose;

const TokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    replacedByToken: { type: String, default: null },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

TokenSchema.index({ user: 1, revoked: 1 });

export default mongoose.model('Token', TokenSchema);
