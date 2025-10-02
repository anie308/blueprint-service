import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl: string;
  mediaUrls: string[];
  authorId: mongoose.Types.ObjectId;
  authorType: 'User' | 'Studio';
  tags: string[];
  likesCount: number;
  commentsCount: number;
  viewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    slug: {
      type: String,
      required: [true, 'Project slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    coverImageUrl: {
      type: String,
      required: [true, 'Cover image is required']
    },
    mediaUrls: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 20; // Limit to 20 media files
        },
        message: 'Cannot have more than 20 media files'
      }
    },
    authorId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Project must have an author'],
      refPath: 'authorType'
    },
    authorType: {
      type: String,
      required: [true, 'Author type is required'],
      enum: ['User', 'Studio']
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 20; // Limit to 20 tags
        },
        message: 'Cannot have more than 20 tags'
      }
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
projectSchema.index({ title: 'text', description: 'text' }); // Text search
projectSchema.index({ slug: 1 });
projectSchema.index({ authorId: 1, authorType: 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ createdAt: -1 }); // For sorting by newest
projectSchema.index({ likesCount: -1 }); // For sorting by popularity
projectSchema.index({ viewsCount: -1 }); // For sorting by views

// Compound indexes
projectSchema.index({ authorType: 1, createdAt: -1 });
projectSchema.index({ tags: 1, createdAt: -1 });

// Pre-save middleware to generate slug if not provided
projectSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim() + '-' + Date.now();
  }
  next();
});

export const Project = mongoose.model<IProject>('Project', projectSchema);