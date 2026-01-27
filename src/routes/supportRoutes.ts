import express from 'express';
import * as supportController from '../controllers/supportController';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WhitelistedUser:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         tenantId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /whitelisting:
 *   post:
 *     summary: Whitelist users (bulk or single)
 *     tags: [Whitelisting]
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               users:
 *                 oneOf:
 *                   - type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                   - type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: string
 *     responses:
 *       201:
 *         description: Users whitelisted successfully
 *   get:
 *     summary: Get all whitelisted users for a tenant
 *     tags: [Whitelisting]
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of whitelisted users
 *
 * /whitelisting/{email}:
 *   patch:
 *     summary: Update a whitelisted user's email
 *     tags: [Whitelisting]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: The new email address
 *     responses:
 *       200:
 *         description: Whitelisted user updated
 *   delete:
 *     summary: Remove a user from whitelist by email
 *     tags: [Whitelisting]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User removed from whitelist
 */
router.post('/whitelisting', supportController.whitelistUsers);
router.get('/whitelisting', supportController.getWhitelistedUsers);
router.patch('/whitelisting/:email', supportController.updateWhitelistedUser);
router.delete('/whitelisting/:email', supportController.deleteWhitelistedUser);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Search by email, name, employeeId, department, designation)
 *     tags: [Users]
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 *
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *   patch:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         department:
 *           type: string
 *         employeeId:
 *           type: string
 *         designation:
 *           type: string
 *         roles:
 *           type: array
 *           items:
 *             type: string
 */
router.get('/users', supportController.getUsers);
router.get('/users/:id', supportController.getUserById);
router.patch('/users/:id', supportController.updateUser);

export default router;
