import mongoose from "mongoose";
const { Schema } = mongoose;

const TaskReadStatusSchema = new Schema(
    {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        task: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
        lastReadAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

TaskReadStatusSchema.index({ user: 1, task: 1 }, { unique: true });

export default mongoose.model("TaskReadStatus", TaskReadStatusSchema);
