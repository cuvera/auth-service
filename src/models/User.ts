import { Schema, Connection, Model } from 'mongoose';
import bcrypt from 'bcrypt';
import validator from 'validator';
import { IUser } from '../interfaces';
import { getDb } from '@cuvera/commons';

export const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        // Password is only required for local authentication
        return this.provider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    samlId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'saml'],
      default: 'local',
    },
    tenantId: {
      type: String,
      default: 'default',
      required: true,
    },
    roles: {
      type: [String],
      default: ['user'],
    },
    employeeId: {
      type: String,
    },
    department: {
      type: String,
    },
    designation: {
      type: String,
    },
    google: {
      googleId: {
        type: String,
        sparse: true,
      },
      googleRefreshToken: {
        type: String,
      },
      googleScopes: {
        type: [String],
        default: [],
      },
      googleCalendarConnected: {
        type: Boolean,
        default: false,
      },
      googleCalendarConnectedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export async function getUserModel(connection?: Connection): Promise<Model<IUser>> {
  if (!connection) {
    connection = await getDb();
  }

  return (connection.models.User as Model<IUser>) || connection.model<IUser>('User', userSchema);
}
