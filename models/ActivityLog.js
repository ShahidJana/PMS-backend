import mongoose from 'mongoose';
const { Schema } = mongoose;

const ActivityLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true },
    resourceType: { type: String, enum: ['User', 'Project', 'Task', 'Other'], default: 'Other' },
    resourceId: { type: Schema.Types.ObjectId, index: true },
    meta: { type: Schema.Types.Mixed },
    transactionId: { type: String, index: true },
    ip: { type: String },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ actor: 1, resourceType: 1, createdAt: -1 });
ActivityLogSchema.index({ createdAt: -1 }); // Optimized for global recent activity feed

export default mongoose.model('ActivityLog', ActivityLogSchema);
