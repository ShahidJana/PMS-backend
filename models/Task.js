import mongoose from "mongoose";
const { Schema } = mongoose;
import softDeletePlugin from "../utils/softDeletePlugin.js";

const STATUS = ["todo", "in-progress", "done", "blocked"];

const TaskSchema = new Schema(
	{
		title: { type: String, required: true, trim: true },
		description: { type: String, default: "" },
		project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
		assignee: { type: Schema.Types.ObjectId, ref: "User", index: true },
		status: { type: String, enum: STATUS, default: "todo", index: true },
		priority: { type: Number, min: 0, max: 5, default: 3 },
		dueDate: { type: Date, index: true },
		labels: [{ type: String }],
		attachments: [
			{
				url: String,
				filename: String,
			},
		],
		commentsCount: { type: Number, default: 0 },
		latestCommentAt: { type: Date },
	},
	{ timestamps: true }
);

TaskSchema.index({ project: 1, status: 1, dueDate: 1 });
TaskSchema.index({ updatedAt: -1 }); // Optimized for latest updates using aggregation
TaskSchema.plugin(softDeletePlugin);

export default mongoose.model("Task", TaskSchema);