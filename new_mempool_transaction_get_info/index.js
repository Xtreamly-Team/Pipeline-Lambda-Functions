import { ethers } from "ethers"



import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
const sqsClient = new SQSClient();
const snsClient = new SNSClient();

export async function sendNormalSNSMessage(messageSerialized, topicArn) {
    const params = {
        TopicArn: topicArn,
        Message: JSON.stringify({'default': messageSerialized}),
        MessageStructure: 'json'
    };
    try {
        const data = await snsClient.send(new PublishCommand(params));
        return data
    } catch (e) {
      console.error(e)
    }
}

export const handler = async (event) => {
    
    const rpc_node_adddress = 'https://nd-hrmrouztdfhwnmw5pn255q3i7a.t.ethereum.managedblockchain.eu-west-2.amazonaws.com?billingtoken=nVBr2VZ5akyj5lRHEOGxobat73ULeOZbm7nBagveIH'

    const provider = new ethers.JsonRpcProvider(rpc_node_adddress);
    
    const inputMessage = JSON.parse(event['Records'][0]['body'])
    console.log(event)

    const hash = inputMessage['txId']
    const timestamp = inputMessage['time']
    
    console.log(hash)

    const transactionInfo = await provider.getTransaction('0xef34a2196e1b72b9cabffe94e40a3549443f1afc6378b6225fc59a9db3de0f6e')
    console.log("GOT")
    console.log(transactionInfo)
    
    // await sendSNSMessage(JSON.stringify(transactionInfo), 'arn:aws:sns:eu-west-2:893048150390:NewMempoolTransactionWithInfo.fifo')
    await sendNormalSNSMessage(JSON.stringify(transactionInfo), 'arn:aws:sns:eu-west-2:893048150390:NewMempoolTransactionWithInfo')
    
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };

    return response;
};


