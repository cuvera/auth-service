import { Router } from 'express';
import {
    createWhitelistedUser,
    getWhitelistedUsers,
    updateWhitelistedUser,
    deleteWhitelistedUser
} from '../controllers/whitelistingController';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WhitelistedUser:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *         tenantId:
 *           type: string
 *         importedAt:
 *           type: string
 *           format: date-time
 * 
 * tags:
 *   name: Whitelisting
 *   description: Whitelisting (Imported User) management API
 */

/**
 * @swagger
 * /whitelisting:
 *   post:
 *     summary: Add user to whitelist
 *     tags: [Whitelisting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         required: false
 *         description: Tenant ID (fallback if not in bearer token)
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
 *             example:
 *               users:
 *                 - email: "user1@example.com"
 *                 - email: "user2@example.com"
 *     responses:
 *       201:
 *         description: Users whitelisted successfully
 */

router.post('/', createWhitelistedUser);

/**
 * @swagger
 * /whitelisting:
 *   get:
 *     summary: Get all whitelisted users
 *     tags: [Whitelisting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant-id
 *         required: false
 *         description: Tenant ID (fallback if not in bearer token)
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of whitelisted users
 */
router.get('/', getWhitelistedUsers);

/**
 * @swagger
 * /whitelisting/{email}:
 *   patch:
 *     summary: Update whitelisted user email
 *     tags: [Whitelisting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: false
 *         description: Tenant ID (fallback if not in bearer token)
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
 *             example:
 *               email: "updated@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch('/:email', updateWhitelistedUser);

/**
 * @swagger
 * /whitelisting/{email}:
 *   delete:
 *     summary: Remove user from whitelist
 *     tags: [Whitelisting]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *       - in: header
 *         name: x-tenant-id
 *         required: false
 *         description: Tenant ID (fallback if not in bearer token)
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: User removed from whitelist
 */
router.delete('/:email', deleteWhitelistedUser);




export default router;
