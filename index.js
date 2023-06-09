const { default: BigNumber } = require('bignumber.js');
const { LotusClient, WsJsonRpcConnector, LotusWalletProvider } = require('filecoin.js');
require('dotenv').config();

(async () => {

  const connector = new WsJsonRpcConnector({ url: 'http://146.190.178.83:2001/rpc/v1', token: process.env.AUTH_TOKEN });

  const lotusClient = new LotusClient(connector);

  lotusClient.chain.chainNotify(async (updates) => {
    updates.forEach(async (update) => {
        console.log("Height: " + update.Val.Height);
        lotusClient.chain.getBlockMessages(update.Val.Cids[0]).then(messages => {
            console.log(messages);
            // look message types
            messages.BlsMessages.forEach(message => {
                // blsMessages has type Message
                console.log(message);
            });
            messages.SecpkMessages.forEach(message => {
                console.log(message.Message);
                // secpkMessages.Message has type Message
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