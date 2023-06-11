"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const filecoin_js_1 = require("filecoin.js");
require('dotenv').config();
(() => __awaiter(void 0, void 0, void 0, function* () {
    let transactionDB, blockDB, accountDB;
    try {
        [transactionDB, blockDB, accountDB] = yield (0, db_1.setUpDBs)();
    }
    catch (e) {
        console.log("Error setting up DBs: " + e);
        return;
    }
    let transactionTable, blockTable, accountTable;
    // convert it true to create tables, then false
    if (false) {
        try {
            [transactionTable, blockTable, accountTable] = yield (0, db_1.createTables)(transactionDB, blockDB, accountDB);
        }
        catch (e) {
            console.log("Error creating tables: " + e);
            return;
        }
        console.log("Tables: ");
        console.log(" transactionTable: " + transactionTable);
        console.log(" blockTable: " + blockTable);
        console.log(" accountTable: " + accountTable);
    }
    else {
        console.log("Tables already exist");
        transactionTable = "transactions_31337";
        blockTable = "blocks_31337";
        accountTable = "accounts_31337";
    }
    const connector = new filecoin_js_1.WsJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });
    const lotusClient = new filecoin_js_1.LotusClient(connector);
    lotusClient.chain.chainNotify((updates) => __awaiter(void 0, void 0, void 0, function* () {
        updates.forEach((update) => __awaiter(void 0, void 0, void 0, function* () {
            console.log("Height: " + update.Val.Height);
            // TODO: insert block into block table
            lotusClient.chain.getBlockMessages(update.Val.Cids[0]).then((messages) => {
                console.log("All messages: ", messages);
                // look message types
                messages.BlsMessages.forEach((message) => {
                    // blsMessages has type Message
                    console.log(message);
                    // TODO: parse message and insert into transaction table
                    // TODO: calculate balance changes (include gas) and insert into account table
                });
                messages.SecpkMessages.forEach((message) => {
                    console.log(message.Message);
                    // secpkMessages.Message has type Message
                    // TODO: parse message and insert into transaction table
                    // TODO: calculate balance changes (include gas) and insert into account table
                });
            });
        }));
    }));
}))().then().catch();
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
