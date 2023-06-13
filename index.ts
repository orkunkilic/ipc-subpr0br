import { BlockHeader, BlockMessages, Cid, HeadChange, Message, SignedMessage } from 'filecoin.js/builds/dist/providers/Types';
import { createAccountsTable,createBlocksTable,createTransactionsTable, setUpDB, insert, query, update } from './db';
import { HttpJsonRpcConnector, LotusClient, WsJsonRpcConnector } from 'filecoin.js';
import { Database } from '@tableland/sdk';
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
    updates.forEach(async (singleUpdate: HeadChange) => {
        console.log("Height: " + singleUpdate.Val.Height);
        singleUpdate.Val.Blocks.forEach(async (block: BlockHeader, index: any) => {
          const blockId = singleUpdate.Val.Cids[index];
          console.log("Blocks: " + singleUpdate.Val.Blocks[index].Height);
          console.log("blockId: " + blockId['/']);
          lotusClient.chain.getBlockMessages(blockId).then((messages: BlockMessages) => {

              let lastBlsTxId = "";
              let lastSecpkTxId = "";
              messages.BlsMessages.forEach(async (message: Message) => {
                  console.log("blsforeach", message.CID['/']);

                  if(lastBlsTxId === message.CID['/']) { return; }
                  lastBlsTxId = message.CID['/'];
                  let blsTxVersion = message.Version;
                  let blsTxTo = message.To;
                  let blsTxFrom = message.From;
                  let blsTxNonce = message.Nonce;
                  let blsTxValue = message.Value;
                  let blsTxGasLimit = message.GasLimit;
                  let blsTxGasFeeCap = message.GasFeeCap;
                  let blsTxGasPremium = message.GasPremium;
                  let blsTxMethod = message.Method;
                  let blsTxParams = "message.Params"; 

                  // insert into transaction table
                  
                  const insertBlsTxResult = await insert(
                    db,
                    `INSERT INTO ${transactionTable} (id, version, "to", "from", nonce, value, gas_limit, gas_fee_cap, gas_premium, method, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      lastBlsTxId,
                      blsTxVersion,
                      blsTxTo,
                      blsTxFrom,
                      blsTxNonce,
                      blsTxValue,
                      blsTxGasLimit,
                      blsTxGasFeeCap,
                      blsTxGasPremium,
                      blsTxMethod,
                      blsTxParams
                    ]
                  );
                  console.log("insertBlsTxResult: " + JSON.stringify(insertBlsTxResult));
                  // TODO: calculate balance changes (include gas) and insert into account table

                  const setFromAccountBalances = async (db: Database, addressTo: string, addressFrom: string) => {
                    addressFrom = blsTxFrom;
                    addressTo = blsTxTo;
                  
                    try {
                      const results: any[] = await query(db, `SELECT balances FROM ${accountTable} WHERE address = "${addressFrom}"`, "");
                      if (results.length > 0) {
                        const prevFromBalance: BigNumber = new BigNumber(results[0].balances);
                        console.log("prevFromBalance: " + prevFromBalance.toString());
                  
                        // Calculate the balance change based on gas fees and value
                        const gasFees: BigNumber = new BigNumber(blsTxGasLimit).times(new BigNumber(blsTxGasPremium).plus(100));
                        const balanceChange: BigNumber = new BigNumber(blsTxValue).plus(gasFees);
                        console.log("balanceChange: " + balanceChange.toString());
                  
                        const newFromBalance: BigNumber = prevFromBalance.minus(balanceChange);
                        console.log("newFromBalance: " + newFromBalance.toString());
                  
                        await update(db, `UPDATE ${accountTable} SET balances = ? WHERE address = ?`, [newFromBalance.toNumber(), addressFrom]);
                      } else {
                      }
                    } catch (e) {
                      const result = await insert(db, `INSERT INTO ${accountTable} (address, nonce, balances) VALUES (?, ?, ?)`, [addressFrom, 0, 0]);
                      console.log(result);
                    }
                  };

                  const setToAccountBalances = async (db: Database, addressTo: string, addressFrom: string) => {
                    addressFrom = blsTxFrom;
                    addressTo = blsTxTo;
                    try {
                      let prevToBalance: any = await query(db, `SELECT balances FROM ${accountTable} WHERE address = ${addressTo}`,addressTo);
                      console.log("prevToBalance: " + prevToBalance);
                      let newToBalance = prevToBalance + blsTxValue;
                      console.log("newToBalance: " + newToBalance);
                      return update(db, `UPDATE ${accountTable} SET balances = ? WHERE address = ?`, [newToBalance, addressTo]);
                    } catch (e) {
                      return insert(db, `INSERT INTO ${accountTable} (address, nonce, balances) VALUES (?, ?, ?)`, [addressTo, 0, 0]);
                    }
                  }
                  setFromAccountBalances(db, blsTxTo, blsTxFrom);
                 // setToAccountBalances(db, blsTxTo, blsTxFrom);

              });
              messages.SecpkMessages.forEach(async (message: SignedMessage) => {
                  console.log("secpkforeach", message.Message.CID['/']);

                  if(lastSecpkTxId === message.Message.CID['/']) { return; }
                  lastSecpkTxId = message.Message.CID['/'];
                  let secpkTxVersion = message.Message.Version;
                  let secpkTxTo = message.Message.To;
                  let secpkTxFrom = message.Message.From;
                  let secpkTxNonce = message.Message.Nonce;
                  let secpkTxValue = message.Message.Value;
                  let secpkTxGasLimit = message.Message.GasLimit;
                  let secpkTxGasFeeCap = message.Message.GasFeeCap;
                  let secpkTxGasPremium = message.Message.GasPremium;
                  let secpkTxMethod = message.Message.Method;
                  let secpkTxParams = "message.Message.Params";

                  // insert into transaction table
                  const insertSecpkTxResult = await insert(
                    db,
                    `INSERT INTO ${transactionTable} (id, version, "to", "from", nonce, value, gas_limit, gas_fee_cap, gas_premium, method, params) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                      lastSecpkTxId,
                      secpkTxVersion,
                      secpkTxTo,
                      secpkTxFrom,
                      secpkTxNonce,
                      secpkTxValue,
                      secpkTxGasLimit,
                      secpkTxGasFeeCap,
                      secpkTxGasPremium,
                      secpkTxMethod,
                      secpkTxParams
                    ]
                  );
                  console.log("insertSecpkTxResult: " + JSON.stringify(insertSecpkTxResult));

                  // TODO: calculate balance changes (include gas) and insert into account table

/*                   const setFromAccountBalances = async (db: Database, addressTo: string, addressFrom: string) => {
                    addressFrom = secpkTxFrom;
                    addressTo = secpkTxTo;
                    try {
                      let prevFromBalance: any = await query(db, `SELECT balances FROM ${accountTable} WHERE address = ?`,addressFrom);
                      console.log("prevFromBalance: " + prevFromBalance);
                      //amount of used gas not return from api
                      let balanceChange = secpkTxValue.toNumber() + (secpkTxGasLimit * (secpkTxGasPremium.toNumber() + 100));
                      console.log("balanceChange: " + balanceChange);
                      let newFromBalance = prevFromBalance - balanceChange;
                      console.log("newFromBalance: " + newFromBalance);
                      return update(db, `UPDATE ${accountTable} SET balances = ? WHERE address = ?`, [newFromBalance, addressFrom]);
                    } catch (e) {
                      return insert(db, `INSERT INTO ${accountTable} (address, nonce, balances) VALUES (?, ?, ?)`, [addressFrom, 0, 0]);
                    }
                  };

                  const setToAccountBalances = async (db: Database, addressTo: string, addressFrom: string) => {
                    addressFrom = secpkTxFrom;
                    addressTo = secpkTxTo;
                    try {
                      let prevToBalance: any = await query(db, `SELECT balances FROM ${accountTable} WHERE address = ?`,addressTo);
                      console.log("prevToBalance: " + prevToBalance);
                      let newToBalance = prevToBalance + secpkTxValue;
                      console.log("newToBalance: " + newToBalance);
                      return update(db, `UPDATE ${accountTable} SET balances = ? WHERE address = ?`, [newToBalance, addressTo]);
                    } catch (e) {
                      return insert(db, `INSERT INTO ${accountTable} (address, nonce, balances) VALUES (?, ?, ?)`, [addressTo, 0, 0]);
                    }
                  }
                  setFromAccountBalances(db, secpkTxTo, secpkTxFrom);
                  setToAccountBalances(db, secpkTxTo, secpkTxFrom); */
              });
          });
          
          const insertBlockResult = await insert(
            db,
            `INSERT INTO ${blockTable} (id, height) VALUES (?, ?)`,
            [
              blockId['/'],
              block.Height
            ]
          );
          console.log("insertBlockResult: " + JSON.stringify(insertBlockResult));
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