import express from 'express';
import { query, setUpDB } from './db';

const db = setUpDB();
const app = express()
const port = 3000


app.get('/blocks', async (req: Request, res: Response) => {
    const colName = req.query.colName as string;
    try {
    let statement = `SELECT ${colName ? colName: '*'} FROM blockTable`;
    const results = await query(await db, statement, colName);

    res.json(results);
    } catch (e) {
        console.log("Error getting blocks: " + e);
        res.status(500).json({ error: 'An error occurred while querying the blocks table' });
    }
  })
  
  app.listen(port, () => {
    console.log(`API listening on port ${port}`)
  })