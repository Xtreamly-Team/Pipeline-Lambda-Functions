import { ethers } from 'ethers';
import { POOL_FACTORY_CONTRACT_ADDRESS, QUOTER_CONTRACT_ADDRESS, TOKENS, FEES } from './constants.js';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json' assert { type: 'json' };
import { getProvider } from './providers.js';
import { toReadableAmount, fromReadableAmount } from './conversion.js';


import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
const sqsClient = new SQSClient();
const snsClient = new SNSClient();

export async function sendSQSMessage(messageSerialized, queueUrl, messageAttributes = undefined) {
    const params = {
        MessageAttributes: messageAttributes,
        MessageBody: messageSerialized,
        QueueUrl: queueUrl,
        MessageGroupId: "1",
    };
    try {
        const data = await sqsClient.send(new SendMessageCommand(params));
    }
    catch (e) {
        console.error(e)
    }
}

export async function sendSNSMessage(messageSerialized, topicArn) {
    const params = {
        TopicArn: topicArn,
        Message: JSON.stringify({ 'default': messageSerialized }),
        MessageStructure: 'json',
    };
    try {
        const data = await snsClient.send(new PublishCommand(params));
        return data
    }
    catch (e) {
        console.error(e)
    }
}

export async function quote(tokenInAddress, amountIn, decimalIn, tokenOutAddress, decimalOut, fee) {
    const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, Quoter.abi, getProvider());
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(tokenInAddress, tokenOutAddress, fee, fromReadableAmount(amountIn, decimalIn).toString(), 0);
    return toReadableAmount(quotedAmountOut, decimalOut);
}

export const handler = async (event, context) => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    for (const record of event['Records']) {
        const inputMessage = JSON.parse(record['body'])
        console.log(inputMessage)
        const tokenPair = inputMessage['tokenPair']
        const blockNumber = inputMessage['blockNumber']
        const tokenInAddress = inputMessage['tokenInAddress']
        const tokenInDecimals = inputMessage['tokenInDecimals']
        const tokenOutAddress = inputMessage['tokenOutAddress']
        const tokenOutDecimals = inputMessage['tokenOutDecimals']
        const pool = inputMessage['pool']
        console.log(pool)
        const fee = pool['fee']
        // const [token0, token1] = tokenPair.split('-')
        // const tokenIn = TOKENS[token0]
        // const tokenOut = TOKENS[token1]

        const amountIn = 1

        const quotedPrice = await quote(tokenInAddress, amountIn, tokenInDecimals, tokenOutAddress, tokenOutDecimals, fee)

        const res = {
            blockNumber: blockNumber,
            tokenPair: tokenPair,
            quotedPrice: quotedPrice,
            poolAddress: pool['address'],
            fee: pool['fee']
        }

        console.log("RESULT: \n" + JSON.stringify(res, null, 2));
        // arn:aws:sns:eu-west-2:893048150390:NewQuotedPrice.fifo
        await sendSNSMessage(JSON.stringify(res),
            'arn:aws:sns:eu-west-2:893048150390:NewQuotedPrice'
        )
    }


    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };

    return response;
};
