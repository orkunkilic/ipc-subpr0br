import { createAccountsTable,createBlocksTable,createTrancastionTable, setUpDBs, insert } from './db';
import { LotusClient, WsJsonRpcConnector } from 'filecoin.js';
require('dotenv').config();

(async () => {
  let transactionDB;
  let blockDB;
  let accountDB;

  try {
    [transactionDB,blockDB,accountDB] = await setUpDBs();
  } catch (e) {
    console.log("Error setting up DBs: " + e);
    return;
  }
  let transactionTable, blockTable, accountTable;

  // convert it true to create tables, then false
  if (true) {
    try {
      [transactionTable] = await createTrancastionTable(transactionDB);
      [blockTable] = await createBlocksTable(blockDB);
      [accountTable] = await createAccountsTable(accountDB);

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
  lotusClient.chain.chainNotify(async (updates: any) => {
    console.log("b")
    updates.forEach(async (update: any) => {
        console.log("Height: " + update.Val.Height);
        console.log((update))
        // TODO: insert block into block table

        lotusClient.chain.getBlockMessages(update.Val.Cids[0]).then((messages: any) => {
            console.log("All messages: ", messages);
            // look message types
            messages.BlsMessages.forEach((message: any) => {
                // blsMessages has type Message
                console.log(message);

                // TODO: parse message and insert into transaction table

                // TODO: calculate balance changes (include gas) and insert into account table
            });
            messages.SecpkMessages.forEach((message: any) => {
                console.log(message.Message);
                // secpkMessages.Message has type Message

                // TODO: parse message and insert into transaction table

                // TODO: calculate balance changes (include gas) and insert into account table
            });
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