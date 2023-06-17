
import express from 'express';
import cors from 'cors';
import { query, setUpDB } from './db';
import { Database } from '@tableland/sdk';
import path from 'path';

export type Request = express.Request;
export type Response = express.Response;

let db: Database;
const app = express()
const port = 3002

//app.use(cors());

let transactionsTable: string, blocksTable: string, accountsTable: string, crossChainTable: string;

const setup = async () => {
    db = await setUpDB();
}

setup();

app.get('/api/crosschain', async (req: Request, res: Response) => {
    const transactionId = req.query.transactionId as string;
    try {
        let statement = `SELECT * FROM ${crossChainTable} WHERE id = "${transactionId}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting crosschain: " + e);
        res.status(500).json({ error: 'An error occurred while querying the crosschain table' });
    }
});

app.get('/api/crosschains', async (req: Request, res: Response) => {
    let block_id = req.query.block_id as string;
    try {
        let statement = `SELECT * FROM ${crossChainTable} WHERE block_id = "${block_id}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting crosschain: " + e);
        res.status(500).json({ error: 'An error occurred while querying the crosschain table' });
    }
});

app.get('/api/lastcrosschains', async (req: Request, res: Response) => {
    try {
        let statement = `SELECT * FROM ${crossChainTable} ORDER BY height DESC LIMIT 10`;
        console.log(statement);
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting crosschain: " + e);
        res.status(500).json({ error: 'An error occurred while querying the crosschain table' });
    }
});

app.get('/api/transaction', async (req: Request, res: Response) => {
    const transactionId = req.query.transactionId as string;
    try {
        let statement = `SELECT * FROM ${transactionsTable} WHERE id = "${transactionId}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/api/transactions', async (req: Request, res: Response) => {
    let block_id = req.query.block_id as string;
    try {
        let statement = `SELECT * FROM ${transactionsTable} WHERE block_id = "${block_id}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/api/lasttransactions', async (req: Request, res: Response) => {
    try {
        let statement = `SELECT * FROM ${transactionsTable} ORDER BY block_height DESC LIMIT 10`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});

app.get('/api/block', async (req: Request, res: Response) => {
  const block_id = req.query.block_id as string;
  try {
    // FIX: your query is wrong.
    let statement = `SELECT * FROM ${blocksTable} WHERE id = "${block_id}"`;
    const results = await query(db, statement);
    res.json(results);
  } catch (e) {
      console.log("Error getting blocks: " + e);
      res.status(500).json({ error: 'An error occurred while querying the blocks table' });
  }
});

app.get('/api/lastblocks', async (req: Request, res: Response) => {
    try {
        let statement = `SELECT * FROM ${blocksTable} ORDER BY height DESC LIMIT 10`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting blocks: " + e);
        res.status(500).json({ error: 'An error occurred while querying the blocks table' });
    }
});

app.get('/api/account', async (req: Request, res: Response) => {
    const accountId = req.query.accountId as string;
    try {
        let statement = `SELECT * FROM ${accountsTable} WHERE address = "${accountId}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting accounts: " + e);
        res.status(500).json({ error: 'An error occurred while querying the accounts table' });
    }
});

app.get('/api/ownedtransactions', async (req: Request, res: Response) => {
    const accountId = req.query.accountId as string;
    try {
        let statement = `SELECT * FROM ${transactionsTable} WHERE "from" = "${accountId}" or "to" = "${accountId}"`;
        const results = await query(db, statement);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
});


app.use(express.static(path.resolve(__dirname, '..', 'filecoin-indexer-frontend', 'build')));
app.get('/*', (req: Request, res: Response) => {
    res.sendFile(path.resolve(__dirname, '..', 'filecoin-indexer-frontend', 'build', 'index.html'));
})

const args = process.argv.slice(2);
transactionsTable = args[0];
blocksTable = args[1];
accountsTable = args[2];
crossChainTable = args[3];

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
});
