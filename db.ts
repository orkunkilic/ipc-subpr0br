import { Database, Statement } from "@tableland/sdk";
import { BigNumber } from 'bignumber.js';
import { Wallet, providers } from "ethers";
import { NonceManager } from "@ethersproject/experimental";
import * as dotenv from "dotenv";
import { Message } from "filecoin.js/builds/dist/providers/Types";
dotenv.config();

declare module 'filecoin.js/builds/dist/providers/Types' {
  interface Message {
    CID: Cid;
  }
}


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
        id TEXT,
        block_id TEXT,
        version INTEGER,
        "to" TEXT,
        "from" TEXT,
        nonce INTEGER,
        value INTEGER,
        gas_limit INTEGER,
        gas_fee_cap INTEGER,
        gas_premium INTEGER,
        method INTEGER,
        params TEXT,
        PRIMARY KEY (id, block_id)
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
      balance INTEGER
    )`
  ).run();
  const{ name: accountsName} = createAccountsTx.txn!;
  
  return accountsName;
};

export const createCursorTable = async (
  db: Database
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const cursorPrefix: string = "cursor"

  console.log("Creating a cursor table...");

  const { meta: createCursorTx} = await db
  .prepare(
    `CREATE TABLE ${cursorPrefix} (
      id INTEGER PRIMARY KEY,
      height INTEGER
    )`
  ).run();
  const{ name: cursorName} = createCursorTx.txn!;
  
  return cursorName;
};

export const createCrossChainTransactionsTable = async (
  db: Database
) => {
  // This is the table's `prefix`; a custom table value prefixed as part of the table's name
  const crossPrefix: string = "crossChain"

  console.log("Creating a crosschain table...");

  const { meta: createCrossTable} = await db
  .prepare(
    `CREATE TABLE ${crossPrefix} (
      height INTEGER,
      version INTEGER,
      "to" TEXT,
      "from" TEXT,
      nonce INTEGER,
      value INTEGER,
      method INTEGER,
      params TEXT,
      PRIMARY KEY (height, "to", "from", nonce)
    )`
  ).run();
  const{ name: crossName} = createCrossTable.txn!;
  
  return crossName;
};

export const insert = async (
    db: Database,
    statement: string,
    values: any[]
) => {
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
    statement: string
) => {
    const {results} = await db.prepare(statement)
    .all();

    return(results);
};

export const update = async (
    db: Database,
    statement: string,
    values: any[]
) => {
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

export const batchProcess = async (
    db: Database,
    statements: Statement[]
) => {
    try {
        const results = await db.batch(statements);

        return results;
    } catch (e) {
        console.log("error:" + e);
        
        return false;
    }
}

export const processAccountChanges = async (
  message: Message,
  db: Database,
  accountsTable: string,
) => {
  console.log("Processing account changes for message: " + message.CID['/']);

  const from = message.From;
  const to = message.To;
  const value = new BigNumber(message.Value);
  const gasFeeCap = new BigNumber(message.GasFeeCap);
  const gasPremium = new BigNumber(message.GasPremium);
  const gasLimit = new BigNumber(message.GasLimit);
  
  const fromAccountQuery = await query(db, `SELECT * FROM ${accountsTable} WHERE address="${from}"`);
  const toAccountQuery = await query(db, `SELECT * FROM ${accountsTable} WHERE address="${to}"`);

  const fromAccount = fromAccountQuery[0] as any;
  const toAccount = toAccountQuery[0] as any;

  const gasPaid = gasFeeCap.times(gasLimit);
  const totalPaid = value.plus(gasPaid);

  const createStatements: Statement[] = [];

  if (!fromAccount) {
    console.log("Creating account for: " + from);
    createStatements.push(db.prepare(`INSERT INTO ${accountsTable} (address, nonce, balance) VALUES (?, ?, ?)`).bind([from, 0, 0]));
  }

  if (!toAccount) {
    console.log("Creating account for: " + to);
    createStatements.push(db.prepare(`INSERT INTO ${accountsTable} (address, nonce, balance) VALUES (?, ?, ?)`).bind([to, 0, 0]));
  }
  if (createStatements.length > 0) {
    const createResults = await batchProcess(db, createStatements);

    if (!createResults) {
      console.log("Error creating accounts");
      return false;
    }

    try {
      await Promise.all(createResults.map(result => result.meta?.txn?.wait()));
    } catch (e) {
      console.log("Error waiting for account creation");
      return false;
    }
  }

  const fromBalance = new BigNumber(fromAccount?.balances || 0);
  const toBalance = new BigNumber(toAccount?.balances || 0);

  const newFromBalance = fromBalance.minus(totalPaid);
  const newToBalance = toBalance.plus(value);

  const batchStatements: Statement[] = [];

  batchStatements.push(db.prepare(`UPDATE ${accountsTable} SET balance = ? WHERE address = ?`).bind([newFromBalance, from]));
  batchStatements.push(db.prepare(`UPDATE ${accountsTable} SET balance = ? WHERE address = ?`).bind([newToBalance, to]));

  // update nonce
  const newNonce = (fromAccount?.nonce || 0) + 1;
  batchStatements.push(db.prepare(`UPDATE ${accountsTable} SET nonce = ? WHERE address = ?`).bind([newNonce, from]));

  try {
    const results = await batchProcess(db, batchStatements);

    if (!results) {
      console.log("Error updating accounts");
      return false;
    }

    const waitAll = results.map((result) => result.meta?.txn?.wait());

    console.log("Waiting for account updates to be mined...");
    try {
      await Promise.all(waitAll);
    } catch (e) {
      console.log("Error waiting for account updates to be mined");
      return false;
    }

    return true;
  } catch (e) {
    console.log("error:" + e);
    
    return false;
  }
}