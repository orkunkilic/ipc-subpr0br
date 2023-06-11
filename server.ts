import express from 'express';
import { query, setUpDB } from './db';

export type Request = express.Request;
export type Response = express.Response;

const db = setUpDB();
const app = express()
const port = 3000


app.get('/blocks', async (req: Request, res: Response) => {
  const blockId = req.query.blockId as string;
  try {
    // FIX: your query is wrong.
    // Example select -> SELECT * FROM blockTable WHERE id = 1 || SELECT height FROM blockTable WHERE id = 1
    let statement = `SELECT ${blockId ? blockId: '*'} FROM blockTable`;
    const results = await query(await db, statement, blockId);

    res.json(results);
  } catch (e) {
      console.log("Error getting blocks: " + e);
      res.status(500).json({ error: 'An error occurred while querying the blocks table' });
  }
});
  
app.listen(port, () => {
  console.log(`API listening on port ${port}`)
})