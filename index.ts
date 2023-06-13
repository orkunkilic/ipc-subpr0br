import { BlockHeader, BlockMessages, Cid, HeadChange, Message, SignedMessage } from 'filecoin.js/builds/dist/providers/Types';
import { createAccountsTable,createBlocksTable,createTransactionsTable, setUpDB, insert, query, update, createCursorTable, processAccountChanges, batchProcess } from './db';
import { HttpJsonRpcConnector, LotusClient, WsJsonRpcConnector } from 'filecoin.js';
import { Database, Statement } from '@tableland/sdk';
import { BigNumber } from 'bignumber.js';
require('dotenv').config();

declare module 'filecoin.js/builds/dist/providers/Types' {
  interface Message {
    CID: Cid;
  }
}

(async () => {
  let db: Database

  try {
    db = await setUpDB();
  } catch (e) {
    console.log("Error setting up DBs: " + e);
    return;
  }
  let transactionTable: string, blockTable: string, accountTable: string, cursorTable: string;

  // convert it true to create tables, then false
  if (true) {
    try {
      transactionTable = await createTransactionsTable(db);
      blockTable = await createBlocksTable(db);
      accountTable = await createAccountsTable(db);
      cursorTable = await createCursorTable(db);
    } catch (e) {
      console.log("Error creating tables: " + e);
      return;
    }
    console.log("Tables: ");
    console.log(" transactionTable: " + transactionTable);
    console.log(" blockTable: " + blockTable);
    console.log(" accountTable: " + accountTable);
    console.log(" cursorTable: " + cursorTable);
  } else {
    console.log("Tables already exist");
    transactionTable = "transactions_31337_2";
    blockTable = "blocks_31337_3";
    accountTable = "accounts_31337_4";
  }

  // const connector = new HttpJsonRpcConnector({ url: 'https://api.calibration.node.glif.io/rpc/v1'});
  const connector = new HttpJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });
  const lotusClient = new LotusClient(connector);

  // wait for 5 seconds to let the everything start up
  await new Promise(resolve => setTimeout(resolve, 5000));

  // let lastSyncedHeight = ((await query(db, `SELECT height FROM ${cursorTable}`)) as any[])[0]?.height || 645202; // we cannot query 0, rpc disallows it
  let lastSyncedHeight = ((await query(db, `SELECT height FROM ${cursorTable}`)) as any[])[0]?.height || 0; // in local, party!
  console.log("Last synced height: " + lastSyncedHeight);

  while (true) {
    const head = await lotusClient.chain.getHead();
    if (head.Height > lastSyncedHeight) {
      for (let i = lastSyncedHeight + 1; i <= lastSyncedHeight + 51; i++) {
        console.log("Syncing height: " + i);
        const tipSet = await lotusClient.chain.getTipSetByHeight(i);
        
        const blockInsertStatements: Statement[] = [];
        for (let j = 0; j <= tipSet.Blocks.length - 1; j++) {
          const block = tipSet.Blocks[j];
          const blockInsertStatement = db.prepare(`INSERT INTO ${blockTable} (id, height) VALUES (?, ?)`).bind(tipSet.Cids[j]['/'], block.Height);
          blockInsertStatements.push(blockInsertStatement);

          const blockMessages = await lotusClient.chain.getBlockMessages(tipSet.Cids[j]);
          
          const messageInsertStatements: Statement[] = [];

          for(let k = 0; k <= blockMessages.BlsMessages.length - 1; k++) {
            const message = blockMessages.BlsMessages[k];
            const messageInsertStatement = db
              .prepare(`INSERT INTO ${transactionTable} (id, block_id, version, "to", "from", nonce, value, gas_limit, gas_fee_cap, gas_premium, method, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(
                message.CID['/'],
                tipSet.Cids[j]['/'],
                message.Version,
                message.To,
                message.From,
                message.Nonce,
                message.Value,
                message.GasLimit,
                message.GasFeeCap,
                message.GasPremium,
                message.Method,
                "message.Params"
              );
            messageInsertStatements.push(messageInsertStatement);

            // process accounts
            await processAccountChanges(message, db, accountTable);
          };

          for(let k = 0; k <= blockMessages.SecpkMessages.length - 1; k++) {
            const message = blockMessages.SecpkMessages[k];
            const messageInsertStatement = db
              .prepare(`INSERT INTO ${transactionTable} (id, block_id, version, "to", "from", nonce, value, gas_limit, gas_fee_cap, gas_premium, method, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind(
                message.Message.CID['/'],
                tipSet.Cids[j]['/'],
                message.Message.Version,
                message.Message.To,
                message.Message.From,
                message.Message.Nonce,
                message.Message.Value,
                message.Message.GasLimit,
                message.Message.GasFeeCap,
                message.Message.GasPremium,
                message.Message.Method,
                "message.Message.Params"
            );
            messageInsertStatements.push(messageInsertStatement);

            // process accounts
            await processAccountChanges(message.Message, db, accountTable);
          }

          console.log("Inserting messages at block id: " + tipSet.Cids[j]['/']);
          if (messageInsertStatements.length === 0) {
            console.log("No messages to insert at block id: " + tipSet.Cids[j]['/']);
            continue;
          }

          const results = await batchProcess(db, messageInsertStatements);
          if (!results) {
            console.log("Error inserting messages at block id: " + tipSet.Cids[j]['/'])
            continue;
          }

          console.log("Waiting for messages to be mined at block id: " + tipSet.Cids[j]['/']);

          try {
            await Promise.all(results.map(result => result.meta?.txn?.wait()));
          } catch (e) {
            console.log("Error waiting for messages to be mined at block id: " + tipSet.Cids[j]['/']);
            console.log(e);
          }
        }

        console.log("Inserting blocks at height: " + i);
        if (blockInsertStatements.length === 0) {
          console.log("No blocks to insert at height: " + i);
          continue;
        }

        const results = await batchProcess(db, blockInsertStatements);
        if (!results) {
          console.log("Error inserting blocks at height: " + i)
          continue;
        }

        console.log("Waiting for blocks to be mined at height: " + i);

        try {
          await Promise.all(results.map(result => result.meta?.txn?.wait()));
        } catch (e) {
          console.log("Error waiting for blocks to be mined at height: " + i);
          console.log(e);
        }

        console.log("==========================================");
      }

      console.log("Saving last synced height: " + head.Height);
      await insert(
        db,
        `INSERT INTO ${cursorTable} (height) VALUES (?)`,
        [head.Height]
      );

      lastSyncedHeight = head.Height;
    }

    console.log("Waiting for chain to sync");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

})().then().catch();