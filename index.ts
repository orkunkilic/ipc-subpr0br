import { BlockHeader, BlockMessages, Cid, HeadChange, Message, SignedMessage } from 'filecoin.js/builds/dist/providers/Types';
import { createAccountsTable,createBlocksTable,createTransactionsTable, setUpDB, insert } from './db';
import { HttpJsonRpcConnector, LotusClient, WsJsonRpcConnector } from 'filecoin.js';
import { Database } from '@tableland/sdk';
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
  let transactionTable: string, blockTable: string, accountTable: string;

  // convert it true to create tables, then false
  if (true) {
    try {
      transactionTable = await createTransactionsTable(db);
      blockTable = await createBlocksTable(db);
      accountTable = await createAccountsTable(db);

    } catch (e) {
      console.log("Error creating tables: " + e);
      return;
    }
    console.log("Tables: ");
    console.log(" transactionTable: " + transactionTable);
    console.log(" blockTable: " + blockTable);
    console.log(" accountTable: " + accountTable);
  } else {
    console.log("Tables already exist");
    transactionTable = "transactions_31337_2";
    blockTable = "blocks_31337_3";
    accountTable = "accounts_31337_4";
  }

  const connector = new HttpJsonRpcConnector({ url: 'https://api.calibration.node.glif.io/rpc/v1'});
  const lotusClient = new LotusClient(connector);
  let lastSyncBlockHeight = 0;
  console.log("aa")
  lotusClient.chain.chainNotify(async (updates: HeadChange[]) => {
    console.log("checking height")
    if (lastSyncBlockHeight === updates[0].Val.Height) {return;}
    lastSyncBlockHeight = updates[0].Val.Height;
    updates.forEach(async (update: HeadChange) => {
        console.log("Height: " + update.Val.Height);
        update.Val.Blocks.forEach(async (block: BlockHeader, index: any) => {
          const blockId = update.Val.Cids[index];
          console.log("Blocks: " + update.Val.Blocks[index].Height);
          console.log("blockId: " + blockId['/']);
          lotusClient.chain.getBlockMessages(blockId).then((messages: BlockMessages) => {
              console.log("All messages: ", messages);
              // look message types
              messages.BlsMessages.forEach((message: Message) => {
                  console.log("blsforeach");
                  console.log(message);
                  // this cid is tx id 
                  let blsTxId = message.CID['/']; 
                  console.log("blsTxId: " + blsTxId);
                  // insert into transaction table

                  // TODO: calculate balance changes (include gas) and insert into account table
              });
              messages.SecpkMessages.forEach((message: SignedMessage) => {
                  console.log("secpkforeach");
                  console.log(message.Message);
                  // secpkMessages.Message has type Message

                  // TODO: parse message and insert into transaction table

                  // TODO: calculate balance changes (include gas) and insert into account table
              });
          });
          
          const insertResult = await insert(
            db,
            `INSERT INTO ${blockTable} (id, height) VALUES (?, ?)`,
            [
              blockId['/'],
              block.Height
            ]
          );
          console.log("insertResult: " + JSON.stringify(insertResult));
        });



    });
  })

})().then().catch();

/* 
export declare class Message {
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
*/