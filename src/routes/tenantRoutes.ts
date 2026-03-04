import express from 'express';
import { getAllTenants, getTenantByDomain, getTenantById } from '../controllers/tenantController';

const router = express.Router();

// Internal route for getting all tenants (not exposed in Swagger to avoid public access)
router.get('/', getAllTenants);

// get tenant by domain name
router.get('/logo', getTenantByDomain);
/**
 * @swagger
 * /tenants/{domain}:
 *   get:
 *     summary: Get tenant by domain name
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: domain
 *         schema:
 *           type: string
 *         required: true
 *         description: Domain name
 *     responses:
 *       200:
 *         description: A tenant object
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
 *                     tenant:
 *                       type: object
 *                       properties:
 *                         logo:
 *                           type: string
 *                         favicon:
 *                           type: string
 */

// get tenant by id
router.get('/:tenantId', getTenantById);


export default router;
