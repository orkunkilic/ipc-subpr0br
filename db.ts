import { Database } from "@tableland/sdk";
import { BigNumber } from 'bignumber.js';
import { Wallet, providers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;

interface TransactionsSchema {
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

interface BlocksSchema {
    // TODO: add block schema
}

interface AccountsSchema {
    // TODO: add account schema
}

export const setUpDBs = async () => {
    const wallet = new Wallet(privateKey!);
    const provider = new providers.JsonRpcProvider("http://127.0.0.1:8545"); // Local tableland (hardhat) node
    const signer = wallet.connect(provider);
  
    // Default to grabbing a wallet connection in a browser
    const transactionDB = new Database<TransactionsSchema>({signer});
    const blockDB = new Database<BlocksSchema>({signer});
    const accountDB = new Database<AccountsSchema>({signer});

    return [transactionDB, blockDB, accountDB]
}

export const createTables = async (
    transactionDB: Database<TransactionsSchema>,
    blockDB: Database<BlocksSchema>,
    accountDB: Database<AccountsSchema>
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const prefix: string = "transactions";

  console.log("Creating a table...");

  const { meta: createTx } = await transactionDB
    .prepare(
      `CREATE TABLE ${prefix} (
        id INTEGER PRIMARY KEY,
        version INTEGER,
        "to" TEXT,
        "from" TEXT,
        nonce INTEGER,
        value INTEGER,
        gas_limit INTEGER,
        gas_fee_cap INTEGER,
        gas_premium INTEGER,
        method INTEGER,
        params TEXT
      );`
    )
    .run();

  const { name: transactionName } = createTx.txn!;

  // TODO: create blocks and accounts tables

  return [transactionName, '', '']
};

export const insert = async (
    db: Database<TransactionsSchema> | Database<BlocksSchema> | Database<AccountsSchema>,
    statement: string,
    values: any[]
) => {
    console.log("Inserting a row into the table...");
    
    // Insert a row into the table
    const { meta: insert, results } = await db
        .prepare(statement)
        .bind(...values)
        .run();
    
    // Wait for transaction finality
    await insert.txn?.wait();
    
    // Return the inserted row's ID
    return [insert, results];
}
