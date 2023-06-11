import { Database } from "@tableland/sdk";
import { BigNumber } from 'bignumber.js';
import { Wallet, getDefaultProvider, providers, Signer } from "ethers";
import { name } from "./create";
import * as dotenv from "dotenv";
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;

interface Schema {
    id: number;
    Version?: number;
    To: string;
    From: string;
    Nonce: number;
    Value: BigNumber;
    GasLimit: number;
    GasFeeCap: BigNumber;
    GasPremium: BigNumber;
    Method: number;
    Params: string;
}

const wallet = new Wallet(privateKey!);
const provider = getDefaultProvider(`http://146.190.178.83:2001/rpc/v1/${process.env.AUTH_TOKEN}`);
const signer = wallet.connect(provider);

// Default to grabbing a wallet connection in a browser
const db = new Database<Schema>({signer});

// Insert a row into the table
const { meta: insert } = await db
  .prepare(`INSERT INTO ${name} (
    id,
     Version,
      To,
       From,
        Nonce,
         Value,
          GasLimit,
           GasFeeCap,
            GasPremium,
             Method,
              Params
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`)
  .bind(0, "Bobby Tables")
  .run();

// Wait for transaction finality
await insert.txn?.wait();

// Perform a read query, requesting all rows from the table
const { results } = await db.prepare(`SELECT * FROM ${name};`).all();