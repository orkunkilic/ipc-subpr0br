import BigNumber from'bignumber.js';
import { LotusClient, WsJsonRpcConnector, LotusWalletProvider } from 'filecoin.js';
require('dotenv').config();

(async () => {

  const connector = new WsJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });

  const lotusClient = new LotusClient(connector);
  const lotusProvider = new LotusWalletProvider(lotusClient);

  console.log("Balance: ", await lotusProvider.getBalance('t15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq')); 
  
  const message = await lotusProvider.createMessage({
    From: 't15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq',
    To: 't15fxtlrmtujbam4ftsbp3ostd5wpgqw7dez63qvq',
    Value: new BigNumber(100),
  });

  const msg = await lotusProvider.sendMessage(message);
  console.log(msg);

  return;

})().then().catch();