import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  profilePictureUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks: string[];
  subscriptionTier: 'free' | 'pro' | 'premium';
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  matchPassword(enteredPassword: string): Promise<boolean>;
  toJSON(): any;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ]
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false // Don't include password in queries by default
    },
    profilePictureUrl: {
      type: String,
      default: null
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: null
    },
    location: {
      type: String,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: null
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
    socialLinks: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.every(link => /^https?:\/\/.+/.test(link));
        },
        message: 'All social links must be valid URLs'
      }
    },
    subscriptionTier: {
      type: String,
      enum: ['free', 'pro', 'premium'],
      default: 'free'
    },
    lastSeen: {
      type: Date,
      default: null
    }
    
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        const { _id, __v, passwordHash, ...userData } = ret;
        return {
          id: _id,
          ...userData
        };
      }
    }
  }
);

// Index for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ subscriptionTier: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to check password
userSchema.methods.matchPassword = async function(enteredPassword: string): Promise<boolean> {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);