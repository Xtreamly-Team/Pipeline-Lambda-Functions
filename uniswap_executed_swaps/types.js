export class SwapData {
    blockNumber;
    timestamp;
    gasPrice;
    gasUsed;
    hash;
    amount0;
    amount1;
    amountUSD;
    sqrtPriceX96;
    executionPrice;
    tick;
    sender;
    recipient;
    origin;
    poolAddress;
    token0Address;
    token1Address;
    token0Symbol;
    token1Symbol;
    isBuy;
    constructor(swapData) {
        this.hash = swapData.transaction.id;
        this.blockNumber = parseInt(swapData.transaction.blockNumber);
        this.timestamp = parseInt(swapData.transaction.timestamp);
        this.gasPrice = parseFloat(swapData.transaction.gasPrice);
        this.gasUsed = parseFloat(swapData.transaction.gasUsed);
        this.amount0 = parseFloat(swapData.amount0);
        this.amount1 = parseFloat(swapData.amount1);
        this.amountUSD = parseFloat(swapData.amountUSD);
        this.sqrtPriceX96 = parseFloat(swapData.sqrtPriceX96);
        this.executionPrice = Math.abs(parseFloat(swapData.amount1) / parseFloat(swapData.amount0));
        this.tick = parseInt(swapData.tick);
        this.sender = swapData.sender;
        this.recipient = swapData.recipient;
        this.origin = swapData.origin;
        this.poolAddress = swapData.pool.id;
        this.token0Address = swapData.token0.id;
        this.token1Address = swapData.token1.id;
        this.token0Symbol = swapData.token0.symbol;
        this.token1Symbol = swapData.token1.symbol;
        this.isBuy = this.amount0 > 0;
        return this;
    }
}
//# sourceMappingURL=types.js.map