import { ethers } from 'ethers';
import { computePoolAddress } from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json' assert { type: 'json' };
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' assert { type: 'json' };
import { POOL_FACTORY_CONTRACT_ADDRESS, QUOTER_CONTRACT_ADDRESS, TOKENS, FEES } from './constants.js';
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
  } catch (e) {
      console.error(e)
  }
}

export async function sendSNSMessage(messageSerialized, topicArn) {
    const params = {
        TopicArn: topicArn,
        Message: JSON.stringify({'default': messageSerialized}),
        MessageStructure: 'json',
    };
    try {
        const data = await snsClient.send(new PublishCommand(params));
        return data
    } catch (e) {
      console.error(e)
    }
}

export async function quote(tokenInAddress, amountIn, decimalIn, tokenOutAddress, decimalOut, fee) {
    const quoterContract = new ethers.Contract(QUOTER_CONTRACT_ADDRESS, Quoter.abi, getProvider());
    const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(tokenInAddress, tokenOutAddress, fee, fromReadableAmount(amountIn, decimalIn).toString(), 0);
    return toReadableAmount(quotedAmountOut, decimalOut);
}

export function getPoolAddress(tokenIn, tokenOut, fee) {
    const poolAddress = computePoolAddress({
        factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
        tokenA: tokenIn,
        tokenB: tokenOut,
        fee: fee,
    });
    return poolAddress
}

async function getPoolConstants(tokenIn, tokenOut, userFee) {
    const poolAddress = getPoolAddress(tokenIn, tokenOut, userFee)
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, getProvider());
    const [token0, token1, fee] = await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
    ]);
    return {
        poolAddress,
        token0,
        token1,
        fee: fee,
    };
}

export const handler = async (event, context) => {
    console.log("EVENT: \n" + JSON.stringify(event, null, 2));
    const inputMessage = JSON.parse(event['Records'][0]['body'])
    console.log(inputMessage)
    const tokenPair = inputMessage['tokenPair']
    const blockNumber = inputMessage['blockNumber']
    const [token0, token1] = tokenPair.split('-')
    const tokenIn = TOKENS[token0]
    const tokenOut = TOKENS[token1]
    const poolConstantsList = []
    
    for (const fee of Object.values(FEES)) {
        const poolConstants = await getPoolConstants(tokenIn, tokenOut, fee)
        const singlePool = {
            address: poolConstants.poolAddress,
            fee: poolConstants.fee
        }
        poolConstantsList.push(
                singlePool
            )
        const singlePoolRes = {
            blockNumber: blockNumber,
            tokenPair: tokenPair,
            tokenInAddress: tokenIn.address,
            tokenInDecimals: tokenIn.decimals,
            tokenOutAddress: tokenOut.address,
            tokenOutDecimals: tokenOut.decimals,
            pool: singlePool
        }
        
        console.log(singlePoolRes)
        
        // await sendSQSMessage(JSON.stringify(singlePoolRes), 
        // 'https://sqs.eu-west-2.amazonaws.com/893048150390/uniswap_pool_address_request_info.fifo'
        // )

        const snsRes = await sendSNSMessage(JSON.stringify(singlePoolRes), 
        'arn:aws:sns:eu-west-2:893048150390:NewBlockTokenPairsWithDetails'
        )
        
        console.log(snsRes)
        
    }
    
    const res = {
        blockNumber: blockNumber,
        tokenPair: tokenPair,
        tokenInAddress: tokenIn.address,
        tokenInDecimals: tokenIn.decimals,
        tokenOutAddress: tokenOut.address,
        tokenOutDecimals: tokenOut.decimals,
        pools: poolConstantsList
    }
    
    console.log("RESULT: \n" + JSON.stringify(res, null, 2));
    
    return res
};
