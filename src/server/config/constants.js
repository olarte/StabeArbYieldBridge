export const UNISWAP_V3_ABIS = {
  Factory: [
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)"
  ],
  Pool: [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function liquidity() external view returns (uint128)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function fee() external view returns (uint24)"
  ],
  Quoter: [
    "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)"
  ]
};

export const FUSION_PLUS_CONFIG = {
  settlement_contract: '0x00000000009726632680FB29d3F7A9734E3010E2',
  resolver_address: '0x0000000000Ad78ba0Db9d54f07C3B1a30F3f5b8D'
};

export const CHAINLINK_PRICE_FEEDS = {
  ethereum: {
    'USDC/USD': '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E'
  },
  sui: {
    'USDC/USD': '0x0' // Mock address for Sui
  }
};