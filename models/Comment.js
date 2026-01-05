import mongoose from "mongoose";
const { Schema } = mongoose;
import softDeletePlugin from "../utils/softDeletePlugin.js";

const CommentSchema = new Schema(
    {
        content: { type: String, required: true, trim: true },
        task: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
        author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    },
    { timestamps: true }
);

CommentSchema.plugin(softDeletePlugin);

export default mongoose.model("Comment", CommentSchema);
