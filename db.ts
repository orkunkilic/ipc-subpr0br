import { Database } from "@tableland/sdk";
import { BigNumber } from 'bignumber.js';
import { Wallet, providers } from "ethers";
import { NonceManager } from "@ethersproject/experimental";
import * as dotenv from "dotenv";
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;

interface TransactionsSchema {
    id: string;
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
    id: string;
    Height: number;    
}

interface AccountsSchema {
    Address: string;
    Nonce: number;
    Balances: number;
}

export const setUpDB = async () => {
    const wallet = new Wallet(privateKey!);
    const provider = new providers.JsonRpcProvider("http://127.0.0.1:8545"); // Local tableland (hardhat) node
    const baseSigner = wallet.connect(provider);
    const signer = new NonceManager(baseSigner);
  
    // Default to grabbing a wallet connection in a browser
    const db = new Database({signer});

    return db
}

export const createTransactionsTable = async (
  db: Database
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const transactionsPrefix: string = "transactions";
  console.log("Creating a transaction table ...");

  const { meta: createTransactionsTx } = await db
    .prepare(
      `CREATE TABLE ${transactionsPrefix} (
        id TEXT PRIMARY KEY,
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

  const { name: transactionName } = createTransactionsTx.txn!;
  
  return transactionName;
};
export const createBlocksTable = async (
  db: Database
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const blocksPrefix: string = "blocks"
  console.log("Creating a blocks table...");

  const { meta: createBlocksTx } = await db
  .prepare(
    `CREATE TABLE ${blocksPrefix} (
      id TEXT PRIMARY KEY,
      height INTEGER
    )`
  ).run();
  const {name: blocksName} = createBlocksTx.txn!;
  
  return blocksName;
};

export const createAccountsTable = async (
  db: Database
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const accountsPrefix: string = "accounts"

  console.log("Creating a accounts table...");

  const { meta: createAccountsTx} = await db
  .prepare(
    `CREATE TABLE ${accountsPrefix} (
      address TEXT PRIMARY KEY,
      nonce INTEGER,
      balances INTEGER
    )`
  ).run();
  const{ name: accountsName} = createAccountsTx.txn!;
  
  return accountsName;
};

export const insert = async (
    db: Database,
    statement: string,
    values: any[]
) => {
    console.log("Inserting a row into the table...");
    try {
    // Insert a row into the table
    const { meta: insert } = await db
        .prepare(statement)
        .bind(...values)
        .run();
    
    // Wait for transaction finality
    await insert.txn?.wait();
    
    // Return the inserted row's ID
    return insert;
    } catch (e) {
        console.log("error:" + e);
        return "error";
    }
};

export const query = async (
    db: Database,
    statement: string,
    colName: any
) => {
    const {results} = await db.prepare(statement)
    .all(colName);

    console.log(results);
    return(results);
};

export const update = async (
    db: Database,
    statement: string,
    values: any[]
) => {
    console.log("Updating a row into the table...");
    try {
    // Update a row into the table
    const { meta: update } = await db
        .prepare(statement)
        .bind(...values)
        .run();
    
    // Wait for transaction finality
    await update.txn?.wait();
    
    // Return the updated row's ID
    return update;
    } catch (e) {
        console.log("error:" + e);
        return "error";
    }
}