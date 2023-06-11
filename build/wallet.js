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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const filecoin_js_1 = require("filecoin.js");
require('dotenv').config();
(() => __awaiter(void 0, void 0, void 0, function* () {
    const connector = new filecoin_js_1.WsJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });
    const lotusClient = new filecoin_js_1.LotusClient(connector);
    const lotusProvider = new filecoin_js_1.LotusWalletProvider(lotusClient);
    console.log("Balance: ", yield lotusProvider.getBalance('t15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq'));
    const message = yield lotusProvider.createMessage({
        From: 't15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq',
        To: 't15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq',
        Value: new bignumber_js_1.default(100),
    });
    const msg = yield lotusProvider.sendMessage(message);
    console.log(msg);
    return;
}))().then().catch();
