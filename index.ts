import { BlockHeader, BlockMessages, Cid, HeadChange, Message, SignedMessage } from 'filecoin.js/builds/dist/providers/Types';
import { createAccountsTable,createBlocksTable,createTransactionsTable, setUpDB, insert, query, update, createCursorTable, processAccountChanges, batchProcess, createCrossChainTransactionsTable } from './db';
import { HttpJsonRpcConnector, LotusClient, WsJsonRpcConnector } from 'filecoin.js';
import { Database, Statement } from '@tableland/sdk';
import { BigNumber } from 'bignumber.js';
// child process
import { spawn } from 'child_process';
const fs = require('fs');
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
  let transactionTable: string = "";
  let blockTable: string = "";
  let accountTable: string= "";
  let cursorTable: string = "";
  let crossChainTransactionTable: string = "";

  // read tables.json to see if tables exist
  try {
    let data = fs.readFileSync('tables.json');
    let tables = JSON.parse(data);
    transactionTable = tables.transactionTable;
    blockTable = tables.blockTable;
    accountTable = tables.accountTable;
    cursorTable = tables.cursorTable;
    crossChainTransactionTable = tables.crossChainTransactionTable;
  } catch (e) {
    console.log("Error reading tables.json: " + e);
  }

  // convert it true to create tables, then false
  if (crossChainTransactionTable == "") {
    try {
      transactionTable = await createTransactionsTable(db);
      blockTable = await createBlocksTable(db);
      accountTable = await createAccountsTable(db);
      cursorTable = await createCursorTable(db);
      crossChainTransactionTable = await createCrossChainTransactionsTable(db);
    } catch (e) {
      console.log("Error creating tables: " + e);
      return;
    }
    console.log("Tables: ");
    console.log(" transactionTable: " + transactionTable);
    console.log(" blockTable: " + blockTable);
    console.log(" accountTable: " + accountTable);
    console.log(" cursorTable: " + cursorTable);
    console.log(" crossChainTransactionTable: " + crossChainTransactionTable);

    // save names into tables.json
    let tables = {
      transactionTable: transactionTable,
      blockTable: blockTable,
      accountTable: accountTable,
      cursorTable: cursorTable,
      crossChainTransactionTable: crossChainTransactionTable
    };

    fs.writeFile('tables.json', JSON.stringify(tables), function (err: any) {
      if (err) throw err;
      console.log('Saved tables to tables.json');
    });
  }

  // const connector = new HttpJsonRpcConnector({ url: 'https://api.calibration.node.glif.io/rpc/v1'});
  const connector = new HttpJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });
  const lotusClient = new LotusClient(connector);

  const rootConnector = new HttpJsonRpcConnector({ url: 'http://146.190.178.83:1234/rpc/v1', token: process.env.ROOT_AUTH_TOKEN });
  const rootLotusClient = new LotusClient(rootConnector);

  // wait for 5 seconds to let the everything start up
  await new Promise(resolve => setTimeout(resolve, 5000));

  // run server.js in a child process with args
  const child = spawn('node', ['./build/server.js', transactionTable, blockTable, accountTable, cursorTable, crossChainTransactionTable]);

  child.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
  });

  child.stderr.on('data', (data) => {
    console.log(`Server stderr: ${data}`);
  });

  // let lastSyncedHeight = ((await query(db, `SELECT height FROM ${cursorTable}`)) as any[])[0]?.height || 645202; // we cannot query 0, rpc disallows it
  let lastSyncedHeight = ((await query(db, `SELECT height FROM ${cursorTable}`)) as any[])[0]?.height || -1; // in local, party!
  // if -1, insert height -1 into cursor table
  if (lastSyncedHeight == -1) {
    await insert(db, `INSERT INTO ${cursorTable} (id, height) VALUES (?, ?)`, [0, -1]);
  }
  console.log("Last synced height: " + lastSyncedHeight);

  while (true) {
    const head = await lotusClient.chain.getHead();
    if (head.Height > lastSyncedHeight) {
      for (let i = lastSyncedHeight + 1; i <= lastSyncedHeight + 51; i++) {
        console.log("Syncing height: " + i);

        /* console.log(await rootLotusClient.conn.request({method: 'Filecoin.IPCListChildSubnets', params: [
          "t064"
        ]})) */

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

        console.log("Checking cross-chain messages at height " + i);
        try {
          const checkpoint = await rootLotusClient.conn.request({method: 'Filecoin.IPCGetCheckpoint', params: [
            {
              "Parent": "/root",
              "Actor": "t01002"
            },
            i
          ]});

          if (checkpoint.Data && checkpoint.Data.CrossMsgs && checkpoint.Data.CrossMsgs.CrossMsgs) {
            const crossMessages = checkpoint.Data.CrossMsgs.CrossMsgs.map((message: any) => (
              {
                from: message.From.RawAddress,
                to: message.To.RawAddress,
                Method: message.Method,
                Params: message.Params,
                Value: message.Value,
                Nonce: message.Nonce,
              }
            ))
            
            const messageInsertStatements: Statement[] = [];
            
            for(let k = 0; k <= crossMessages.length - 1; k++) {
              const message = crossMessages[k];
              const messageInsertStatement = db
                .prepare(`INSERT INTO ${crossChainTransactionTable} (height, version, "to", "from", nonce, value, method, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(
                  i,
                  message.Version,
                  message.To,
                  message.From,
                  message.Nonce,
                  message.Value,
                  message.Method,
                  "message.Params"
                );
              messageInsertStatements.push(messageInsertStatement);

            }

            if (messageInsertStatements.length === 0) {
              console.log("No cross-chain messages to insert at height: " + i);
              continue;
            } else {
              console.log("Inserting cross-chain messages at height: " + i);
              const results = await batchProcess(db, messageInsertStatements);
              if (!results) {
                console.log("Error inserting cross-chain messages at height: " + i)
                continue;
              }

              console.log("Waiting for cross-chain messages to be mined at height: " + i);

              try {
                await Promise.all(results.map(result => result.meta?.txn?.wait()));
              } catch (e) {
                console.log("Error waiting for cross-chain messages to be mined at height: " + i);
                console.log(e);
              }
            }
            
          } else {
            console.log("No cross-chain messages to insert at height: " + i);
          }
        } catch (e: any) {
          console.log(e.message);
        }

        console.log("Saving last synced height: " + i);
        await update(
          db,
          `UPDATE ${cursorTable} SET height = ? WHERE id = 0`,
          [i]
        )


        console.log("==========================================");
      }
    }

    console.log("Waiting for chain to sync");
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

})().then().catch();