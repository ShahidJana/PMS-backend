import mongoose from "mongoose";
const { Schema } = mongoose;
import softDeletePlugin from "../utils/softDeletePlugin.js";

const emailRegex = /^\S+@\S+\.\S+$/;

const UserSchema = new Schema(
    {
        name: { type: String, required: true, trim: true, minlength: 2 },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: emailRegex,
            index: true,
        },
        password: { type: String, required: true, minlength: 8 },
        role: { type: String, enum: ["member", "admin", "pm"], default: "member" },
        lastLogin: { type: Date },
    },
    { timestamps: true }
);

UserSchema.index({ name: 'text' });
UserSchema.plugin(softDeletePlugin);

export default mongoose.model("User", UserSchema);

