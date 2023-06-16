
import express from 'express';
import { query, setUpDB } from './db';

export type Request = express.Request;
export type Response = express.Response;

const db = setUpDB();
const app = express()
const port = 3002


app.get('/transaction', async (req: Request, res: Response) => {
    const transactionId = req.query.transactionId as string;
    try {
        let statement = `SELECT * FROM transactions_31337_2 WHERE id = "${transactionId}"`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/transactions', async (req: Request, res: Response) => {
    let block_id = req.query.block_id as string;
    try {
        let statement = `SELECT * FROM transactions_31337_2 WHERE block_id = "${block_id}"`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/lasttransactions', async (req: Request, res: Response) => {
    try {
        let statement = `SELECT * FROM transactions_31337_2 ORDER BY id DESC LIMIT 5`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/block', async (req: Request, res: Response) => {
  const block_id = req.query.block_id as string;
  try {
    // FIX: your query is wrong.
    // Example select -> SELECT * FROM blockTable WHERE id = 1 || SELECT height FROM blockTable WHERE id = 1
    let statement = `SELECT * FROM blocks_31337_3 WHERE id = "${block_id}"`; //CHANGE BLOCKTABLE NAME
    const results = await query(await db, statement);
    res.json(results);
  } catch (e) {
      console.log("Error getting blocks: " + e);
      res.status(500).json({ error: 'An error occurred while querying the blocks table' });
  }
});

app.get('/lastblocks', async (req: Request, res: Response) => {
    try {
        let statement = `SELECT * FROM blocks_31337_3 ORDER BY id DESC LIMIT 5`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting blocks: " + e);
        res.status(500).json({ error: 'An error occurred while querying the blocks table' });
    }
});

app.get('/account', async (req: Request, res: Response) => {
    const accountId = req.query.accountId as string;
    try {
        let statement = `SELECT * FROM accounts_31337_4 WHERE address = "${accountId}"`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting accounts: " + e);
        res.status(500).json({ error: 'An error occurred while querying the accounts table' });
    }
});

app.get('/ownedtransactions', async (req: Request, res: Response) => {
    const accountId = req.query.accountId as string;
    try {
        let statement = `SELECT * FROM transactions_31337_2 WHERE "from" = "${accountId}" or "to" = "${accountId}"`;
        const results = await query(await db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
