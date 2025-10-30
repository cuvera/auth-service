import User from '../models/User';
import { IUser, ICreateUserRequest, IUpdateUserRequest } from '../interfaces';

export class UserService {
  async createUser(userData: ICreateUserRequest): Promise<IUser> {
    const user = new User(userData);
    return user.save();
  }

  async getAllUsers(tenantId: string, page: number = 1, limit: number = 10, search?: string): Promise<{ users: IUser[]; totalCount: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    
    let searchQuery: any = { tenantId };
    
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); 
      searchQuery = {
        ...searchQuery,
        $or: [
          { name: { $regex: searchRegex } },
          { email: { $regex: searchRegex } }
        ]
      };
    }
    
    const [users, totalCount] = await Promise.all([
      User.find(searchQuery).select('-password').skip(skip).limit(limit),
      User.countDocuments(searchQuery)
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      users,
      totalCount,
      totalPages
    };
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

  async getDepartmentUserCounts(): Promise<{ department: string; count: number; percentage: number }[]> {
    const totalCount = await User.countDocuments({ department: { $exists: true, $ne: null } });
    
    if (totalCount === 0) {
      return [];
    }

    const departmentCounts = await User.aggregate([
      { $match: { department: { $exists: true, $ne: null } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          department: '$_id',
          count: 1,
          percentage: {
            $round: [
              { $multiply: [{ $divide: [{ $toDouble: '$count' }, totalCount] }, 100] },
              2
            ]
          }
        }
      }
    ]);
    
    return departmentCounts;
  }
}

export default new UserService();
