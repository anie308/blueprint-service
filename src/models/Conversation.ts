import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
  _id: string;
  participants: mongoose.Types.ObjectId[];
  lastMessageId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage extends Document {
  _id: string;
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  content: string;
  readBy: mongoose.Types.ObjectId[];
  sentAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessageId: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      default: null
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

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Message must belong to a conversation']
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Message must have a sender']
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      minlength: [1, 'Message cannot be empty'],
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    readBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    sentAt: {
      type: Date,
      default: Date.now
    }
  },
  {
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
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

messageSchema.index({ conversationId: 1, sentAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ readBy: 1 });

// Validation to ensure conversation has exactly 2 participants
conversationSchema.pre('save', function(next) {
  if (this.participants.length !== 2) {
    next(new Error('Conversation must have exactly 2 participants'));
  } else {
    next();
  }
});

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
export const Message = mongoose.model<IMessage>('Message', messageSchema);