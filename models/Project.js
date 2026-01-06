import mongoose from "mongoose";
const { Schema } = mongoose;
import softDeletePlugin from "../utils/softDeletePlugin.js";

const ProjectSchema = new Schema(
	{
		title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
		description: { type: String, default: "", maxlength: 500 },
		owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
		members: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
		startDate: { type: Date },
		dueDate: { type: Date },
		status: { type: String, enum: ['active', 'completed'], default: 'active', index: true },
		meta: { type: Schema.Types.Mixed },
	},
	{ timestamps: true }
);

ProjectSchema.index({ title: "text", description: "text" });
ProjectSchema.plugin(softDeletePlugin);

export default mongoose.model("Project", ProjectSchema);