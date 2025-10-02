import mongoose, { Document, Schema } from 'mongoose';

export interface IPost extends Document {
  _id: string;
  content: string;
  mediaUrl?: string;
  authorId: mongoose.Types.ObjectId;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      minlength: [1, 'Content cannot be empty'],
      maxlength: [2000, 'Content cannot exceed 2000 characters']
    },
    mediaUrl: {
      type: String,
      default: null
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Post must have an author']
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
postSchema.index({ authorId: 1 });
postSchema.index({ createdAt: -1 }); // For sorting by newest
postSchema.index({ likesCount: -1 }); // For sorting by popularity
postSchema.index({ content: 'text' }); // Text search

export const Post = mongoose.model<IPost>('Post', postSchema);