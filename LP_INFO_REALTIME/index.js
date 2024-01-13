import { ethers } from "ethers"
import V3Pool from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json" assert { type: 'json' };

const POOL_CONTRACT_ADDRESS_EXAMPLE = '0x11b815efb8f581194ae79006d24e0d814b7697f6';
// const token0ContractDefinition = require('./ERC20.json.js');

import ERC20Contract from "./ERC20.json" assert { type: 'json' };

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
    } catch (e) {
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
    } catch (e) {
        console.error(e)
    }
}

async function getData(poolContractAddress, token0Decimal, token1Decimal, provider) {
    const result = {};

    const poolContract = new ethers.Contract(poolContractAddress, V3Pool.abi, provider);

    const slot0Data = await poolContract.slot0();
    const token0Address = ethers.utils.getAddress(await poolContract.token0());
    const token1Address = ethers.utils.getAddress(await poolContract.token1());

    const token0Contract = new ethers.Contract(token0Address, ERC20Contract.abi, provider);
    const token1Contract = new ethers.Contract(token1Address, ERC20Contract.abi, provider);

    const token0Balance = ethers.utils.formatUnits(await token0Contract.balanceOf(poolContractAddress), token0Decimal);
    const token1Balance = ethers.utils.formatUnits(await token1Contract.balanceOf(poolContractAddress), token1Decimal);

    const tick = slot0Data[1];
    const token0Price = Math.pow(1.0001, Math.abs(tick)) * Math.pow(10, +token1Decimal) * Math.pow(10, -token0Decimal);

    const token1Price = 1.0 / token0Price;

    const liquidityWei = await poolContract.liquidity();
    const liquidity = ethers.utils.formatUnits(liquidityWei, 0);

    result.liquidity = liquidity;
    result.token0Price = token0Price;
    result.token1Price = token1Price;
    result.token0Balance = token0Balance;
    result.token1Balance = token1Balance;
    result.token0Address = token0Address
    result.token1Address = token1Address
    result.totalValueLockedInTermOfToken1 = parseFloat(token1Balance) + (parseFloat(token0Balance) * (token1Price));
    result.ValueLockedToken1 = parseFloat(token1Balance);
    result.ValueLockedToken0 = (parseFloat(token0Balance) * (token1Price));
    result.feeProtocol = slot0Data.feeProtocol
    result.tick = slot0Data.tick
    result.sqrtPriceX96 = slot0Data.sqrtPriceX96.toString()

    return result;
}

export const handler = async (event) => {

    const provider = new ethers.providers.JsonRpcProvider(`https://nd-hrmrouztdfhwnmw5pn255q3i7a.t.ethereum.managedblockchain.eu-west-2.amazonaws.com?billingtoken=nVBr2VZ5akyj5lRHEOGxobat73ULeOZbm7nBagveIH`);
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    for (const record of event['Records']) {
        const inputMessage = JSON.parse(record['body'])
        console.log(inputMessage)
        const tokenPair = inputMessage['tokenPair']
        const blockNumber = inputMessage['blockNumber']
        const tokenInAddress = inputMessage['tokenInAddress']
        const tokenOutAddress = inputMessage['tokenOutAddress']
        const tokenInDecimals = inputMessage['tokenInDecimals']
        const tokenOutDecimals = inputMessage['tokenOutDecimals']
        const pool = inputMessage['pool']
        const fee = inputMessage['fee']
        const result = await getData(pool.address, tokenInDecimals, tokenOutDecimals, provider);
        result.blockNumber = blockNumber
        result.poolAddress = pool['address']
        console.log("RESULT: \n" + JSON.stringify(result, null, 2));
        await sendSNSMessage(JSON.stringify(result), 'arn:aws:sns:eu-west-2:893048150390:NewLPInfo')
    }
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };

    return response
}
