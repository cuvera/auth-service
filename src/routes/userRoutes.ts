import { Router } from 'express';
import {
    createUser,
    getAllUsers,
    getUserById,
    addUserRoles,
    removeUserRoles,
    getUserByEmployeeId,
    getDepartmentUserCounts,
    getUsersByEmailIds,
    updateUserDetails,
} from '../controllers/userController';
import { protect, restrictTo } from '../middlewares/auth';

const router = Router();

// Apply protect middleware to all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the user
 *         name:
 *           type: string
 *           description: The user's name
 *         email:
 *           type: string
 *           description: The user's email
 *         password:
 *           type: string
 *           description: The user's password
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the user was last updated
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         employeeId:
 *           type: string
 *         department:
 *           type: string
 *         designation:
 *           type: string
 *       example:
 *         id: 60d0fe4f5311236168a109ca
 *         name: Gulshan Banpela
 *         email: gulshan@rootent.com
 *         roles: ["admin", "user"]
 *         employeeId: "10597"
 *         department: "SCM - Sub Contract"
 *         designation: "Manager"
 *         createdAt: 2025-08-14T10:19:06.668Z
 *         updatedAt: 2026-01-21T06:21:22.606Z
 *     UserUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 *         employeeId:
 *           type: string
 *         department:
 *           type: string
 *         designation:
 *           type: string
 *       example:
 *         name: Gulshan Banpela
 *         department: "SCM - Sub Contract"
 *         designation: "General Manager"
 *         employeeId: "10597"
 */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management API
 */

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               name: John Doe
 *               email: john@example.com
 *               password: password123
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 */
router.post('/', createUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users with pagination and search
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter users by name or email (case-insensitive, partial match)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by exact email
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name (partial match)
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         description: Filter by exact employee ID
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: Filter by department (partial match)
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *         description: Filter by designation (partial match)
 *     responses:
 *       200:
 *         description: Paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: number
 *                   description: Number of users in current page
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     totalCount:
 *                       type: integer
 *                       description: Total number of users
 *                     page:
 *                       type: integer
 *                       description: Current page number
 *                     limit:
 *                       type: integer
 *                       description: Number of items per page
 *                     totalPages:
 *                       type: integer
 *                       description: Total number of pages
 *       400:
 *         description: Bad request (invalid pagination parameters)
 */
router.get('/', getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get('/:id', protect, getUserById);

/**
 * @swagger
 * /users/{id}/roles:
 *   put:
 *     summary: Add roles to user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["admin"]
 *     responses:
 *       200:
 *         description: Roles added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: User not found
 */
router.put('/:id/roles', addUserRoles);

/**
 * @swagger
 * /users/{id}/roles:
 *   delete:
 *     summary: Remove roles from user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roles
 *             properties:
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["admin"]
 *     responses:
 *       200:
 *         description: Roles removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin role required)
 *       404:
 *         description: User not found
 */
router.delete('/:id/roles', removeUserRoles);

/**
 * @swagger
 * /users/employee/{employeeId}:
 *   get:
 *     summary: Get user by employee ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.get('/employee/:employeeId', getUserByEmployeeId);

/**
 * @swagger
 * /users/departments/counts:
 *   get:
 *     summary: Get user counts by department
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns the count of users in each department
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   description: Number of departments returned
 *                   example: 3
 *                 data:
 *                   type: object
 *                   properties:
 *                     departments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           department:
 *                             type: string
 *                             description: Department name
 *                             example: Engineering
 *                           count:
 *                             type: integer
 *                             description: Number of users in the department
 *                             example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Requires admin role
 */
router.get('/departments/counts', getDepartmentUserCounts);

/**
 * @swagger
 * /users/bulk-fetch:
 *   post:
 *     summary: Get multiple users by email IDs
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailIds
 *             properties:
 *               emailIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 maxItems: 100
 *                 minItems: 1
 *                 description: Array of email addresses to fetch user details for
 *                 example: ["user1@example.com", "user2@example.com"]
 *     responses:
 *       200:
 *         description: Users fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   description: Number of users found
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     requestedCount:
 *                       type: integer
 *                       description: Number of email IDs requested
 *                       example: 2
 *                     foundCount:
 *                       type: integer
 *                       description: Number of users found
 *                       example: 1
 *       400:
 *         description: Bad request (invalid emailIds array, too many emails, etc.)
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk-fetch', getUsersByEmailIds);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     summary: Update user details
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
router.patch('/:id', updateUserDetails);

export default router;
