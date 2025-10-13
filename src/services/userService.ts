import User from '../models/User';
import { IUser, ICreateUserRequest, IUpdateUserRequest } from '../interfaces';

export class UserService {
  async createUser(userData: ICreateUserRequest): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async getAllUsers(tenantId: string): Promise<IUser[]> {
    return User.find({ tenantId }).select('-password');
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

  async addUserRoles(id: string, newRoles: string[]): Promise<IUser | null> {
    const user = await User.findById(id);
    if (!user) {
      return null;
    }

    const existingRoles = user.roles || [];
    const uniqueNewRoles = newRoles.filter(role => !existingRoles.includes(role));
    const updatedRoles = [...existingRoles, ...uniqueNewRoles];

    return User.findByIdAndUpdate(
      id,
      { roles: updatedRoles },
      { new: true, runValidators: true }
    ).select('-password');
  }

  async removeUserRoles(id: string, rolesToRemove: string[]): Promise<IUser | null> {
    const user = await User.findById(id);
    if (!user) {
      return null;
    }

    const existingRoles = user.roles || [];
    const updatedRoles = existingRoles.filter(role => !rolesToRemove.includes(role));

    if (updatedRoles.length === 0) {
      throw new Error('User must have at least one role');
    }

    return User.findByIdAndUpdate(
      id,
      { roles: updatedRoles },
      { new: true, runValidators: true }
    ).select('-password');
  }
}

export default new UserService();
