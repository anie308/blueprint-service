import mongoose, { Document, Schema } from 'mongoose';

export interface IReel extends Document {
  _id: string;
  title?: string;
  videoUrl: string;
  thumbnailUrl: string;
  description?: string;
  authorId: mongoose.Types.ObjectId;
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const reelSchema = new Schema<IReel>(
  {
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: null
    },
    videoUrl: {
      type: String,
      required: [true, 'Video URL is required']
    },
    thumbnailUrl: {
      type: String,
      required: [true, 'Thumbnail URL is required']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reel must have an author']
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true,
    // toJSON: {
    //   transform: function(doc, ret) {
    //     ret.id = ret._id;
    //     delete ret._id;
    //     delete ret.__v;
    //     return ret;
    //   }
    // }
  }
);

// Indexes for better query performance
reelSchema.index({ authorId: 1 });
reelSchema.index({ createdAt: -1 }); // For sorting by newest
reelSchema.index({ likesCount: -1 }); // For sorting by popularity
reelSchema.index({ viewsCount: -1 }); // For sorting by views
reelSchema.index({ title: 'text', description: 'text' }); // Text search

export const Reel = mongoose.model<IReel>('Reel', reelSchema);