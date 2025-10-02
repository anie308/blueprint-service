import mongoose, { Document, Schema } from 'mongoose';

export interface IStudio extends Document {
  _id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description: string;
  location: string;
  website?: string;
  ownerId: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const studioSchema = new Schema<IStudio>(
  {
    name: {
      type: String,
      required: [true, 'Studio name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Studio name must be at least 2 characters'],
      maxlength: [100, 'Studio name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Studio slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens']
    },
    logoUrl: {
      type: String,
      default: null
    },
    description: {
      type: String,
      required: [true, 'Studio description is required'],
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    location: {
      type: String,
      required: [true, 'Studio location is required'],
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    website: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      },
      default: null
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Studio must have an owner']
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
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
studioSchema.index({ name: 1 });
studioSchema.index({ slug: 1 });
studioSchema.index({ ownerId: 1 });
studioSchema.index({ members: 1 });
studioSchema.index({ location: 1 });

// Pre-save middleware to generate slug if not provided
studioSchema.pre('save', function(next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  next();
});

export const Studio = mongoose.model<IStudio>('Studio', studioSchema);