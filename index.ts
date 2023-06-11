import { BlockHeader, BlockMessages, HeadChange, Message, SignedMessage } from 'filecoin.js/builds/dist/providers/Types';
import { createAccountsTable,createBlocksTable,createTransactionsTable, setUpDB, insert } from './db';
import { LotusClient, WsJsonRpcConnector } from 'filecoin.js';
import { Database } from '@tableland/sdk';
require('dotenv').config();

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
    transactionTable = "transactions_31337";
    blockTable = "blocks_31337";
    accountTable = "accounts_31337";
  }

  const connector = new WsJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });
  const lotusClient = new LotusClient(connector);
  console.log("aa")
  lotusClient.chain.chainNotify(async (updates: HeadChange[]) => {
    console.log("b")
    updates.forEach(async (update: HeadChange) => {
        console.log("Height: " + update.Val.Height);

        update.Val.Blocks.forEach(async (block: BlockHeader, index: any) => {
          const blockId = update.Val.Cids[index];
          lotusClient.chain.getBlockMessages(blockId).then((messages: BlockMessages) => {
              console.log("All messages: ", messages);
              // look message types
              messages.BlsMessages.forEach((message: Message) => {
                  // blsMessages has type Message
                  console.log(message);

                  // TODO: parse message, find transactions inside of it
                  // insert into transaction table

                  // TODO: calculate balance changes (include gas) and insert into account table
              });
              messages.SecpkMessages.forEach((message: SignedMessage) => {
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
          console.log(insertResult);
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