import express from 'express';
import * as supportController from '../controllers/supportController';
import { protect } from '../middlewares/auth';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of whitelisted users with pagination metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 results:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     whitelistedUsers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WhitelistedUser'
 *                     totalCount:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
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
router.post('/', supportController.whitelistUsers);
router.get('/', supportController.getWhitelistedUsers);
router.patch('/:email', supportController.updateWhitelistedUser);
router.delete('/:email', supportController.deleteWhitelistedUser);

export default router;
