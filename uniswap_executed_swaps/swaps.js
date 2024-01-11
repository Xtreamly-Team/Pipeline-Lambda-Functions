import { SwapData } from "./types.js";
import { callQuery, saveToFile } from "./utils.js";
const uniswapV3Subgraph = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

export async function getSwapsRawData(starting_block, end_block, token0, token1, skip) {
    const queryString = `
query swaps {
  swaps(
    where: {token0: "${token0.toLowerCase()}", token1: "${token1.toLowerCase()}", transaction_: {blockNumber_lte: "${end_block}", blockNumber_gte: "${starting_block}"}}
${skip ? "skip: " + skip : ""}
  ) {
    id
    recipient
    sqrtPriceX96
    sender
    tick
    timestamp
    amount0
    amount1
    amountUSD
    origin
    token0 {
      symbol
      name
    }
    token1 {
      name
      symbol
    }
    pool {
      id
    }
    transaction {
      blockNumber
      gasPrice
      gasUsed
      id
      timestamp
    }
  }
}
    `;
    const json = await callQuery(queryString, uniswapV3Subgraph);
    try {
        const res = json.data;
        return res;
    }
    catch (error) {
        console.log(error);
        return null;
    }
}


export function parseSwaps(rawSwapData) {
    const res = rawSwapData?.swaps
        ? rawSwapData.swaps.reduce((accum, swapData) => {
            const swap = new SwapData(swapData);
            accum.push(swap);
            return accum;
        }, [])
        : [];
    return res;
}


export async function getAllSwaps(starting_block, end_block, token0, token1) {
    let res = await getSwapsRawData(starting_block, end_block, token0, token1);
    let swaps = parseSwaps(res);
    let skipped = 0;
    const skipStep = 100;
    if (res && res.swaps) {
        while (res.swaps.length == 100) {
            skipped += skipStep;
            console.log(skipped);
            res = await getSwapsRawData(starting_block, end_block, token0, token1, skipped);
            if (!res || !res.swaps) {
                console.log("Complete");
                break;
            }
            console.log(res.swaps.length);
            const newSwaps = parseSwaps(res);
            swaps = [...swaps, ...newSwaps];
        }
    }
    return swaps
}