import { ethers } from 'ethers';
import { CurrentConfig } from './config.js';

export function getProvider() {
    return new ethers.providers.JsonRpcProvider(CurrentConfig.rpc.mainnet);
}
