"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.insert = exports.createTables = exports.setUpDBs = void 0;
const sdk_1 = require("@tableland/sdk");
const ethers_1 = require("ethers");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const privateKey = process.env.PRIVATE_KEY;
const setUpDBs = () => __awaiter(void 0, void 0, void 0, function* () {
    const wallet = new ethers_1.Wallet(privateKey);
    const provider = new ethers_1.providers.JsonRpcProvider("http://127.0.0.1:8545"); // Local tableland (hardhat) node
    const signer = wallet.connect(provider);
    // Default to grabbing a wallet connection in a browser
    const transactionDB = new sdk_1.Database({ signer });
    const blockDB = new sdk_1.Database({ signer });
    const accountDB = new sdk_1.Database({ signer });
    return [transactionDB, blockDB, accountDB];
});
exports.setUpDBs = setUpDBs;
const createTables = (transactionDB, blockDB, accountDB) => __awaiter(void 0, void 0, void 0, function* () {
    // This is the table's `prefix`; a custom table value prefixed as part of the table's name
    const prefix = "transactions";
    console.log("Creating a table...");
    const { meta: createTx } = yield transactionDB
        .prepare(`CREATE TABLE ${prefix} (
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
      );`)
        .run();
    const { name: transactionName } = createTx.txn;
    // TODO: create blocks and accounts tables
    return [transactionName, '', ''];
});
exports.createTables = createTables;
const insert = (db, statement, values) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Inserting a row into the table...");
    // Insert a row into the table
    const { meta: insert, results } = yield db
        .prepare(statement)
        .bind(...values)
        .run();
    // Wait for transaction finality
    yield ((_a = insert.txn) === null || _a === void 0 ? void 0 : _a.wait());
    // Return the inserted row's ID
    return [insert, results];
});
exports.insert = insert;
