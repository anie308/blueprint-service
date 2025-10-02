import mongoose, { Document, Schema } from 'mongoose';

// Comment Model
export interface IComment extends Document {
  _id: string;
  content: string;
  authorId: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;
  entityId: mongoose.Types.ObjectId;
  entityType: 'Project' | 'Post' | 'Reel';
  createdAt: Date;
  updatedAt: Date;
}

// Like Model
export interface ILike extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  entityId: mongoose.Types.ObjectId;
  entityType: 'Project' | 'Post' | 'Reel';
  createdAt: Date;
}

// SavedItem Model
export interface ISavedItem extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  entityId: mongoose.Types.ObjectId;
  entityType: 'Project' | 'Post' | 'Reel' | 'Job';
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment must have an author']
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Comment must be associated with an entity'],
      refPath: 'entityType'
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Project', 'Post', 'Reel']
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

const likeSchema = new Schema<ILike>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Like must have a user']
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Like must be associated with an entity'],
      refPath: 'entityType'
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Project', 'Post', 'Reel']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

const savedItemSchema = new Schema<ISavedItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Saved item must have a user']
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Saved item must be associated with an entity'],
      refPath: 'entityType'
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      enum: ['Project', 'Post', 'Reel', 'Job']
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

// Indexes for Comment
commentSchema.index({ entityId: 1, entityType: 1, createdAt: -1 });
commentSchema.index({ authorId: 1 });
commentSchema.index({ parentId: 1 });

// Indexes for Like
likeSchema.index({ entityId: 1, entityType: 1 });
likeSchema.index({ userId: 1 });
likeSchema.index({ userId: 1, entityId: 1, entityType: 1 }, { unique: true }); // Prevent duplicate likes

// Indexes for SavedItem
savedItemSchema.index({ userId: 1, createdAt: -1 });
savedItemSchema.index({ entityId: 1, entityType: 1 });
savedItemSchema.index({ userId: 1, entityId: 1, entityType: 1 }, { unique: true }); // Prevent duplicate saves

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
export const Like = mongoose.model<ILike>('Like', likeSchema);
export const SavedItem = mongoose.model<ISavedItem>('SavedItem', savedItemSchema);