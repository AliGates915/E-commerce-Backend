import express from 'express';
import { createTransaction, getTransactions } from '../controllers/transactionController.js';

const router = express.Router();

router.post('/create', createTransaction);
router.get('/', getTransactions);

export default router;
