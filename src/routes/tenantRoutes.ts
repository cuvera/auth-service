import express from 'express';
import { getAllTenants } from '../controllers/tenantController';

const router = express.Router();

router.get('/', getAllTenants);

export default router;
