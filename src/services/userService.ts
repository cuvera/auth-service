import { getUserModel } from '../models/User';
import { IUser, ICreateUserRequest, IUpdateUserRequest } from '../interfaces';
import { getTenantId } from '@cuvera/commons';

export class UserService {
  async createUser(userData: ICreateUserRequest): Promise<IUser> {
    const userModel = await getUserModel();
    const user = new userModel(userData);
    return user.save();
  }

  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: {
      email?: string;
      employeeId?: string;
      name?: string;
      department?: string;
      designation?: string;
    }
  ): Promise<{ users: IUser[]; totalCount: number; totalPages: number }> {
    const userModel = await getUserModel();
    const skip = (page - 1) * limit;

    let searchQuery: any = { tenantId: getTenantId() };

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      searchQuery.$or = [
        { name: { $regex: searchRegex } },
        { email: { $regex: searchRegex } }
      ];
    }

    if (filters) {
      if (filters.email) searchQuery.email = filters.email.toLowerCase();
      if (filters.employeeId) searchQuery.employeeId = filters.employeeId;
      if (filters.name) searchQuery.name = { $regex: new RegExp(filters.name, 'i') };
      if (filters.department) searchQuery.department = { $regex: new RegExp(filters.department, 'i') };
      if (filters.designation) searchQuery.designation = { $regex: new RegExp(filters.designation, 'i') };
    }

    const [users, totalCount] = await Promise.all([
      userModel.find(searchQuery).select('-password -googleId -samlId').skip(skip).limit(limit).sort({ createdAt: -1 }),
      userModel.countDocuments(searchQuery)
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      totalCount,
      totalPages
    };
  }

  async getUserById(id: string): Promise<IUser | null> {
    const userModel = await getUserModel();
    return userModel.findById(id).select('-password');
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    const userModel = await getUserModel();
    return userModel.findOne({ email }).select('+password');
  }

  async getUserByEmployeeId(employeeId: string): Promise<IUser | null> {
    const userModel = await getUserModel();
    return userModel.findOne({ employeeId }).select('-password');
  }

  async updateUser(
    id: string,
    updateData: IUpdateUserRequest,
  ): Promise<IUser | null> {
    const userModel = await getUserModel();
    const query: any = { _id: id, tenantId: getTenantId() };

    return userModel.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');
  }

  async deleteUser(id: string): Promise<IUser | null> {
    const userModel = await getUserModel();
    return userModel.findByIdAndDelete(id);
  }

  async addUserRoles(id: string, newRoles: string[]): Promise<IUser | null> {
    const userModel = await getUserModel();
    const user = await userModel.findById(id);
    if (!user) {
      return null;
    }

    const existingRoles = user.roles || [];
    const uniqueNewRoles = newRoles.filter(role => !existingRoles.includes(role));
    const updatedRoles = [...existingRoles, ...uniqueNewRoles];

    return userModel.findByIdAndUpdate(
      id,
      { roles: updatedRoles },
      { new: true, runValidators: true }
    ).select('-password');
  }

  async removeUserRoles(id: string, rolesToRemove: string[]): Promise<IUser | null> {
    const userModel = await getUserModel();
    const user = await userModel.findById(id);
    if (!user) {
      return null;
    }

    const existingRoles = user.roles || [];
    const updatedRoles = existingRoles.filter(role => !rolesToRemove.includes(role));

    if (updatedRoles.length === 0) {
      throw new Error('User must have at least one role');
    }

    return userModel.findByIdAndUpdate(
      id,
      { roles: updatedRoles },
      { new: true, runValidators: true }
    ).select('-password');
  }

  async getDepartmentUserCounts(): Promise<{ department: string; count: number; percentage: number }[]> {
    const userModel = await getUserModel();
    const totalCount = await userModel.countDocuments({ department: { $exists: true, $ne: null } });

    if (totalCount === 0) {
      return [];
    }

    const departmentCounts = await userModel.aggregate([
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

  async getUsersByEmailIds(emailIds: string[]): Promise<IUser[]> {
    if (!emailIds || emailIds.length === 0) {
      return [];
    }

    const userModel = await getUserModel();
    return userModel.find({ email: { $in: emailIds } }).select('-password');
  }
}

export default new UserService();
