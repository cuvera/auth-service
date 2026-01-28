import { Request, Response } from 'express';
import userService from '../services/userService';
import { catchAsync } from '../utils/catchAsync';
import { AppError } from '../utils/appError';
import { ICreateUserRequest, IApiResponse, IUserResponse, IUserWithRolesResponse, IPaginatedResponse, IBulkFetchUsersRequest, IUpdateUserRequest } from '../interfaces';
import { log } from 'util';

const extractTenantId = (req: Request): string | undefined => {
  return (
    req.user?.tenantId ||
    req.headers['x-tenant-id'] ||
    req.headers['tenant-id'] ||
    req.headers['tenet-id'] ||
    req.headers['tenent-id'] ||
    req.headers['tenantid'] ||
    req.headers['X-Tenant-Id'] ||
    req.headers['Tenant-Id']
  ) as string | undefined;
};

export const createUser = catchAsync(async (req: Request, res: Response) => {
  const { name, email, password }: ICreateUserRequest = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const user = await userService.createUser({ name, email, password });

  const userResponse: IUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    employeeId: user.employeeId,
  };

  const response: IApiResponse<{ user: IUserResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(201).json(response);
});

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const tenantId = extractTenantId(req);
  if (!tenantId) {
    throw new AppError('Tenant ID not found', 400);
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string;

  // Additional filters
  const { email, employeeId, name, department, designation } = req.query;
  const filters = {
    email: email as string,
    employeeId: employeeId as string,
    name: name as string,
    department: department as string,
    designation: designation as string
  };

  if (page < 1) {
    throw new AppError('Page must be greater than 0', 400);
  }
  if (limit < 1 || limit > 100) {
    throw new AppError('Limit must be between 1 and 100', 400);
  }

  const result = await userService.getAllUsers(tenantId, page, limit, search, filters);

  const usersResponse: IUserWithRolesResponse[] = result.users.map(user => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    department: user.department,
    designation: user.designation,
    employeeId: user.employeeId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  const response: IApiResponse<{
    users: IUserWithRolesResponse[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number
  }> = {
    status: 'success',
    results: result.users.length,
    data: {
      users: usersResponse,
      totalCount: result.totalCount,
      page,
      limit,
      totalPages: result.totalPages,
    },
  };

  res.status(200).json(response);
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});

export const getUserByEmployeeId = catchAsync(async (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const user = await userService.getUserByEmployeeId(employeeId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});

export const addUserRoles = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new AppError('Roles array is required and must not be empty', 400);
  }

  const nonStringRoles = roles.filter(role => typeof role !== 'string');
  if (nonStringRoles.length > 0) {
    throw new AppError('All roles must be strings', 400);
  }

  const user = await userService.addUserRoles(id, roles);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserWithRolesResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserWithRolesResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});

export const getDepartmentUserCounts = catchAsync(async (req: Request, res: Response) => {
  const tenantId = req.user?.tenantId;
  // if (!tenantId) {
  //   throw new AppError('Tenant ID not found', 400);
  // }

  // const departmentCounts = await userService.getDepartmentUserCounts(tenantId);
  const departmentCounts = await userService.getDepartmentUserCounts();

  const response: IApiResponse<{ departments: { department: string; count: number }[] }> = {
    status: 'success',
    results: departmentCounts.length,
    data: {
      departments: departmentCounts
    }
  };

  res.status(200).json(response);
});

export const removeUserRoles = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new AppError('Roles array is required and must not be empty', 400);
  }

  const nonStringRoles = roles.filter(role => typeof role !== 'string');
  if (nonStringRoles.length > 0) {
    throw new AppError('All roles must be strings', 400);
  }

  try {
    const user = await userService.removeUserRoles(id, roles);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const userResponse: IUserWithRolesResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      roles: user.roles,
      employeeId: user.employeeId,
      department: user.department,
      designation: user.designation,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const response: IApiResponse<{ user: IUserWithRolesResponse }> = {
      status: 'success',
      data: {
        user: userResponse,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.message === 'User must have at least one role') {
      throw new AppError('Cannot remove all roles. User must have at least one role.', 400);
    }
    throw error;
  }
});

export const getUsersByEmailIds = catchAsync(async (req: Request, res: Response) => {
  const { emailIds }: IBulkFetchUsersRequest = req.body;

  if (!emailIds || !Array.isArray(emailIds)) {
    throw new AppError('emailIds array is required', 400);
  }

  if (emailIds.length === 0) {
    throw new AppError('emailIds array cannot be empty', 400);
  }

  if (emailIds.length > 100) {
    throw new AppError('Cannot fetch more than 100 users at once', 400);
  }

  const nonStringEmails = emailIds.filter(email => typeof email !== 'string');
  if (nonStringEmails.length > 0) {
    throw new AppError('All email IDs must be strings', 400);
  }

  const invalidEmails = emailIds.filter(email => !email.includes('@'));
  if (invalidEmails.length > 0) {
    throw new AppError('All email IDs must be valid email addresses', 400);
  }

  const users = await userService.getUsersByEmailIds(emailIds);

  const usersResponse: IUserWithRolesResponse[] = users.map(user => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    employeeId: user.employeeId,
    department: user.department,
    designation: user.designation,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));

  const response: IApiResponse<{ users: IUserWithRolesResponse[]; requestedCount: number; foundCount: number }> = {
    status: 'success',
    results: users.length,
    data: {
      users: usersResponse,
      requestedCount: emailIds.length,
      foundCount: users.length,
    },
  };

  res.status(200).json(response);
});

export const updateUserDetails = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData: IUpdateUserRequest = req.body;

  const user = await userService.updateUser(id, updateData);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const userResponse: IUserWithRolesResponse = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    roles: user.roles,
    department: user.department,
    designation: user.designation,
    employeeId: user.employeeId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const response: IApiResponse<{ user: IUserWithRolesResponse }> = {
    status: 'success',
    data: {
      user: userResponse,
    },
  };

  res.status(200).json(response);
});
