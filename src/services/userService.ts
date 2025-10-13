import User from '../models/User';
import { IUser, ICreateUserRequest, IUpdateUserRequest } from '../interfaces';

export class UserService {
  async createUser(userData: ICreateUserRequest): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async getAllUsers(): Promise<IUser[]> {
    return User.find().select('-password');
  }

  async getUserById(id: string): Promise<IUser | null> {
    return User.findById(id).select('-password');
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password');
  }

  async getUserByEmployeeId(employeeId: string): Promise<IUser | null> {
    return User.findOne({ employeeId }).select('-password');
  }

  async updateUser(
    id: string,
    updateData: IUpdateUserRequest
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  async deleteUser(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id);
  }
}

export default new UserService();
