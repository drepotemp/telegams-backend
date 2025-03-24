import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  category: string;
}

const CategorySchema = new Schema<ICategory>(
  {
    category: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", CategorySchema);
