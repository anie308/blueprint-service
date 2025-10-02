import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  _id: string;
  title: string;
  description: string;
  location: string;
  salaryRange: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'freelance';
  postedById: mongoose.Types.ObjectId;
  postedByType: 'User' | 'Studio';
  applicationLink?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
      maxlength: [10000, 'Description cannot exceed 10000 characters']
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters']
    },
    salaryRange: {
      type: String,
      required: [true, 'Salary range is required'],
      trim: true,
      maxlength: [100, 'Salary range cannot exceed 100 characters']
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: ['full-time', 'part-time', 'contract', 'freelance']
    },
    postedById: {
      type: Schema.Types.ObjectId,
      required: [true, 'Job must have a poster'],
      refPath: 'postedByType'
    },
    postedByType: {
      type: String,
      required: [true, 'Poster type is required'],
      enum: ['User', 'Studio']
    },
    applicationLink: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Application link must be a valid URL'
      },
      default: null
    },
    expiresAt: {
      type: Date,
      validate: {
        validator: function(v: Date) {
          return !v || v > new Date();
        },
        message: 'Expiry date must be in the future'
      },
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

// Indexes for better query performance
jobSchema.index({ title: 'text', description: 'text' }); // Text search
jobSchema.index({ postedById: 1, postedByType: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ createdAt: -1 }); // For sorting by newest
jobSchema.index({ expiresAt: 1 }); // For filtering active jobs

// Compound indexes
jobSchema.index({ jobType: 1, location: 1 });
jobSchema.index({ postedByType: 1, createdAt: -1 });

export const Job = mongoose.model<IJob>('Job', jobSchema);