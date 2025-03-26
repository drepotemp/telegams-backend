import mongoose, { Schema, Document } from "mongoose";

export interface IMedia extends Document {
  url:string,
  imageUrl: string;
  name: string;
  memberCount: number;
  date: string; // ISO date string
  author: string;
  category: string;
  language: string;
  featured: boolean;
  tags: string[];
  description: string;
  nsfw: boolean;
  status: "Pending" | "Approved" | "Rejected";
  mediaType: "Bot" | "Group" | "Channel" | "Sticker";
  stickerImages:[string]
  animatedSticker:Boolean
}

const MediaSchema: Schema = new Schema(
  {
    url: { type: String,},
    imageUrl: { type: String,},
    name: { type: String, required: true },
    memberCount: { type: Number },
    date: { type: String, required: true }, // Store as ISO string
    author: { type: String, required: true },
    category: { type: String,  },
    language: { type: String,  },
    featured: { type: Boolean,  },
    description: { type: String, },
    tags: { type: [String], default: [] },
    nsfw: { type: Boolean, default: false },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    mediaType: { type: String, enum: ["bot", "group", "channel", "sticker"], },
    stickerImages:{type:[String]},
    animatedSticker:{type:Boolean}
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

const MediaModel = mongoose.model<IMedia>("Media", MediaSchema);
export default MediaModel
