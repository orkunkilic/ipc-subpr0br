import { Database } from "@tableland/sdk";
import { BigNumber } from 'bignumber.js';
import { Wallet, getDefaultProvider, providers, Signer } from "ethers";
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

// This is the table's `prefix`; a custom table value prefixed as part of the table's name
const prefix: string = "indexer_table";

const { meta: create } = await db
  .prepare(`CREATE TABLE ${prefix} 
  (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version INTEGER,
    "to" TEXT,
    "from" TEXT,
    nonce INTEGER,
    value REAL,
    gas_limit INTEGER,
    gas_fee_cap REAL,
    gas_premium REAL,
    method INTEGER,
    params TEXT
    );`
    )
  .run();

const { name } = create.txn!;

export { name };
