import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  recipientId: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'message' | 'job_alert' | 'studio_invite' | 'project_mention';
  sourceId: mongoose.Types.ObjectId;
  sourceType: 'Project' | 'Post' | 'Reel' | 'User' | 'Studio' | 'Job';
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient']
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: ['like', 'comment', 'follow', 'message', 'job_alert', 'studio_invite', 'project_mention']
    },
    sourceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Notification must have a source'],
      refPath: 'sourceType'
    },
    sourceType: {
      type: String,
      required: [true, 'Source type is required'],
      enum: ['Project', 'Post', 'Reel', 'User', 'Studio', 'Job']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Notification message cannot exceed 500 characters']
    },
    isRead: {
      type: Boolean,
      default: false
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

// Indexes for better query performance
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ sourceId: 1, sourceType: 1 });

// Compound index for efficient querying
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);