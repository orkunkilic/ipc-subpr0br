const express = require('express');
import { query, setUpDB } from './db';
import {transactionTable, blockTable, accountTable} from './index';

const db = setUpDB();
const app = express()
const port = 3000


app.get('/blocks', async (req: Request, res: Response) => {
    const colName = req.query.colName as string;
    try {
    let statement = `SELECT ${colName ? colName: '*'} FROM blockTable`;
    const results = await query(db, statement, colName);

    res.json(results);
    } catch (e) {
        console.log("Error getting blocks: " + e);
        return;
    }
  })
  
  app.listen(port, () => {
    console.log(`API listening on port ${port}`)
  })