/* eslint-disable prefer-const */
import { BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Bundle,
  Pair,
  PairDayData,
  Token,
  TokenDayData,
  UbeswapDayData,
  UbeswapFactory,
} from "../types/schema";
import { PairHourData } from "./../types/schema";
import { FACTORY_ADDRESS, ONE_BD, ONE_BI, ZERO_BD, ZERO_BI } from "./helpers";

export function updateUbeswapDayData(event: ethereum.Event): UbeswapDayData {
  let ubeswap = UbeswapFactory.load(FACTORY_ADDRESS);
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let ubeswapDayData = UbeswapDayData.load(dayID.toString());
  if (ubeswapDayData === null) {
    ubeswapDayData = new UbeswapDayData(dayID.toString());
    ubeswapDayData.date = dayStartTimestamp;
    ubeswapDayData.dailyVolumeUSD = ZERO_BD;
    ubeswapDayData.dailyVolumeCELO = ZERO_BD;
    ubeswapDayData.totalVolumeUSD = ZERO_BD;
    ubeswapDayData.totalVolumeCELO = ZERO_BD;
    ubeswapDayData.dailyVolumeUntracked = ZERO_BD;
  }

  ubeswapDayData.totalLiquidityUSD = ubeswap.totalLiquidityUSD;
  ubeswapDayData.totalLiquidityCELO = ubeswap.totalLiquidityCELO;
  ubeswapDayData.txCount = ubeswap.txCount;
  ubeswapDayData.save();

  return ubeswapDayData as UbeswapDayData;
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let dayPairID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(dayID).toString());
  let pair = Pair.load(event.address.toHexString());
  let pairDayData = PairDayData.load(dayPairID);
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID);
    pairDayData.date = dayStartTimestamp;
    pairDayData.token0 = pair.token0;
    pairDayData.token1 = pair.token1;
    pairDayData.pairAddress = event.address;
    pairDayData.dailyVolumeToken0 = ZERO_BD;
    pairDayData.dailyVolumeToken1 = ZERO_BD;
    pairDayData.dailyVolumeUSD = ZERO_BD;
    pairDayData.dailyTxns = ZERO_BI;
  }

  pairDayData.totalSupply = pair.totalSupply;
  pairDayData.reserve0 = pair.reserve0;
  pairDayData.reserve1 = pair.reserve1;
  pairDayData.reserveUSD = pair.reserveUSD;
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI);
  pairDayData.save();

  return pairDayData as PairDayData;
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  let timestamp = event.block.timestamp.toI32();
  let hourIndex = timestamp / 3600; // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600; // want the rounded effect
  let hourPairID = event.address
    .toHexString()
    .concat("-")
    .concat(BigInt.fromI32(hourIndex).toString());
  let pair = Pair.load(event.address.toHexString());
  let pairHourData = PairHourData.load(hourPairID);
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID);
    pairHourData.hourStartUnix = hourStartUnix;
    pairHourData.pair = event.address.toHexString();
    pairHourData.hourlyVolumeToken0 = ZERO_BD;
    pairHourData.hourlyVolumeToken1 = ZERO_BD;
    pairHourData.hourlyVolumeUSD = ZERO_BD;
    pairHourData.hourlyTxns = ZERO_BI;

    // random line to make a redeploy happen
    pairHourData.totalSupply = ZERO_BD;
  }

  pairHourData.reserve0 = pair.reserve0;
  pairHourData.reserve1 = pair.reserve1;
  pairHourData.reserveUSD = pair.reserveUSD;
  pairHourData.totalSupply = pair.totalSupply;

  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI);
  pairHourData.save();

  return pairHourData as PairHourData;
}

export function updateTokenDayData(
  token: Token,
  event: ethereum.Event
): TokenDayData {
  let bundle = Bundle.load("1");
  let timestamp = event.block.timestamp.toI32();
  let dayID = timestamp / 86400;
  let dayStartTimestamp = dayID * 86400;
  let tokenDayID = token.id
    .toString()
    .concat("-")
    .concat(BigInt.fromI32(dayID).toString());

  let tokenDayData = TokenDayData.load(tokenDayID);
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID);
    tokenDayData.date = dayStartTimestamp;
    tokenDayData.token = token.id;
    tokenDayData.priceUSD = token.derivedCUSD.times(ONE_BD);
    tokenDayData.dailyVolumeToken = ZERO_BD;
    tokenDayData.dailyVolumeCELO = ZERO_BD;
    tokenDayData.dailyVolumeUSD = ZERO_BD;
    tokenDayData.dailyTxns = ZERO_BI;
    tokenDayData.totalLiquidityUSD = ZERO_BD;
  }
  tokenDayData.priceUSD = token.derivedCUSD.times(ONE_BD);
  tokenDayData.totalLiquidityToken = token.totalLiquidity;
  tokenDayData.totalLiquidityUSD = token.totalLiquidity.times(
    token.derivedCUSD as BigDecimal
  );
  if (bundle.celoPrice.notEqual(ZERO_BD)) {
    tokenDayData.totalLiquidityCELO = tokenDayData.totalLiquidityUSD.div(
      bundle.celoPrice
    );
  } else {
    tokenDayData.totalLiquidityCELO = ZERO_BD;
  }
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI);
  tokenDayData.save();

  /**
   * @todo test if this speeds up sync
   */
  // updateStoredTokens(tokenDayData as TokenDayData, dayID)
  // updateStoredPairs(tokenDayData as TokenDayData, dayPairID)

  return tokenDayData as TokenDayData;
}
