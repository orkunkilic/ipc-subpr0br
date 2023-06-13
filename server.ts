
import express from 'express';
import { query, setUpDB } from './db';

export type Request = express.Request;
export type Response = express.Response;

const db = setUpDB();
const app = express()
const port = 3000


app.get('/block', async (req: Request, res: Response) => {
  const blockId = req.query.blockId as string;
  try {
    // FIX: your query is wrong.
    // Example select -> SELECT * FROM blockTable WHERE id = 1 || SELECT height FROM blockTable WHERE id = 1
    let statement = `SELECT ${blockId ? blockId: '*'} FROM blocks_31337_3`; //CHANGE BLOCKTABLE NAME
    const results = await query(await db, statement);

    res.json(results);
  } catch (e) {
      console.log("Error getting blocks: " + e);
      res.status(500).json({ error: 'An error occurred while querying the blocks table' });
  }
});

//TODO: need to be parse the messages and get transaction

/* app.get('/transaction', async (req: Request, res: Response) => {
    const transactionId = req.query.transactionId as string;
    try {
        let statement = `SELECT ${transactionId ? transactionId: '*'} FROM transactionTable`;
        const results = await query(await db, statement, transactionId);
        res.json(results);
    } catch (e) {
        console.log("Error getting transactions: " + e);
        res.status(500).json({ error: 'An error occurred while querying the transactions table' });
    }
}); */

/* app.get('/account', async (req: Request, res: Response) => {
    const accountId = req.query.accountId as string;
    try {
        let statement = `SELECT ${accountId ? accountId: '*'} FROM accountTable`;
        const results = await query(await db, statement, accountId);
        res.json(results);
    } catch (e) {
        console.log("Error getting accounts: " + e);
        res.status(500).json({ error: 'An error occurred while querying the accounts table' });
    }
}); */

app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})
