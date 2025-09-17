import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_POOL_SIZE = 101;
const ERR_INVALID_YIELD_RATE = 102;
const ERR_INVALID_DURATION = 103;
const ERR_INVALID_PENALTY = 104;
const ERR_INVALID_THRESHOLD = 105;
const ERR_POOL_ALREADY_EXISTS = 106;
const ERR_POOL_NOT_FOUND = 107;
const ERR_INVALID_POOL_TYPE = 115;
const ERR_INVALID_INTEREST_RATE = 116;
const ERR_INVALID_LOCK_PERIOD = 117;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_DEPOSIT = 110;
const ERR_INVALID_MAX_DEPOSIT = 111;
const ERR_MAX_POOLS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_DEFI_NOT_VERIFIED = 109;
const ERR_INVALID_AMOUNT = 126;
const ERR_POOL_FULL = 125;
const ERR_ALREADY_IN_POOL = 123;
const ERR_NOT_IN_POOL = 124;
const ERR_LOCKED_FUNDS = 127;
const ERR_INVALID_DEFI_PROTOCOL = 128;
const ERR_INVALID_STATUS = 120;

interface Pool {
  name: string;
  minDeposit: number;
  maxDeposit: number;
  yieldRate: number;
  duration: number;
  penalty: number;
  threshold: number;
  timestamp: number;
  creator: string;
  poolType: string;
  interestRate: number;
  lockPeriod: number;
  currency: string;
  status: boolean;
  totalDeposited: number;
  totalShares: number;
  defiProtocol: string;
}

interface PoolUpdate {
  updateName: string;
  updateMinDeposit: number;
  updateMaxDeposit: number;
  updateTimestamp: number;
  updater: string;
}

interface UserShare {
  shares: number;
  depositTime: number;
  lastClaim: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class PoolManagerMock {
  state: {
    nextPoolId: number;
    maxPools: number;
    creationFee: number;
    defiContract: string | null;
    pools: Map<number, Pool>;
    poolUpdates: Map<number, PoolUpdate>;
    poolsByName: Map<string, number>;
    userShares: Map<string, UserShare>;
  } = {
    nextPoolId: 0,
    maxPools: 500,
    creationFee: 500,
    defiContract: null,
    pools: new Map(),
    poolUpdates: new Map(),
    poolsByName: new Map(),
    userShares: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  authorities: Set<string> = new Set(["ST1TEST"]);
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];
  contractBalance: number = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextPoolId: 0,
      maxPools: 500,
      creationFee: 500,
      defiContract: null,
      pools: new Map(),
      poolUpdates: new Map(),
      poolsByName: new Map(),
      userShares: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.authorities = new Set(["ST1TEST"]);
    this.stxTransfers = [];
    this.contractBalance = 0;
  }

  isVerifiedAuthority(principal: string): Result<boolean> {
    return { ok: true, value: this.authorities.has(principal) };
  }

  setDefiContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.defiContract !== null) {
      return { ok: false, value: false };
    }
    this.state.defiContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.defiContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }

  createPool(
    name: string,
    minDeposit: number,
    maxDeposit: number,
    yieldRate: number,
    duration: number,
    penalty: number,
    threshold: number,
    poolType: string,
    interestRate: number,
    lockPeriod: number,
    currency: string,
    defiProtocol: string
  ): Result<number> {
    if (this.state.nextPoolId >= this.state.maxPools) return { ok: false, value: ERR_MAX_POOLS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (minDeposit <= 0) return { ok: false, value: ERR_INVALID_MIN_DEPOSIT };
    if (maxDeposit <= 0) return { ok: false, value: ERR_INVALID_MAX_DEPOSIT };
    if (yieldRate > 100) return { ok: false, value: ERR_INVALID_YIELD_RATE };
    if (duration <= 0) return { ok: false, value: ERR_INVALID_DURATION };
    if (penalty > 50) return { ok: false, value: ERR_INVALID_PENALTY };
    if (threshold <= 0 || threshold > 100) return { ok: false, value: ERR_INVALID_THRESHOLD };
    if (!["lending", "staking", "yield-farming"].includes(poolType)) return { ok: false, value: ERR_INVALID_POOL_TYPE };
    if (interestRate > 20) return { ok: false, value: ERR_INVALID_INTEREST_RATE };
    if (lockPeriod > 365) return { ok: false, value: ERR_INVALID_LOCK_PERIOD };
    if (!["STX", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (!["alex", "arkadiko", "velar"].includes(defiProtocol)) return { ok: false, value: ERR_INVALID_DEFI_PROTOCOL };
    if (!this.isVerifiedAuthority(this.caller).value) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.poolsByName.has(name)) return { ok: false, value: ERR_POOL_ALREADY_EXISTS };
    if (!this.state.defiContract) return { ok: false, value: ERR_DEFI_NOT_VERIFIED };

    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.defiContract });

    const id = this.state.nextPoolId;
    const pool: Pool = {
      name,
      minDeposit,
      maxDeposit,
      yieldRate,
      duration,
      penalty,
      threshold,
      timestamp: this.blockHeight,
      creator: this.caller,
      poolType,
      interestRate,
      lockPeriod,
      currency,
      status: true,
      totalDeposited: 0,
      totalShares: 0,
      defiProtocol,
    };
    this.state.pools.set(id, pool);
    this.state.poolsByName.set(name, id);
    this.state.nextPoolId++;
    return { ok: true, value: id };
  }

  getPool(id: number): Pool | null {
    return this.state.pools.get(id) || null;
  }

  updatePool(id: number, updateName: string, updateMinDeposit: number, updateMaxDeposit: number): Result<boolean> {
    const pool = this.state.pools.get(id);
    if (!pool) return { ok: false, value: false };
    if (pool.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateMinDeposit <= 0) return { ok: false, value: false };
    if (updateMaxDeposit <= 0) return { ok: false, value: false };
    if (this.state.poolsByName.has(updateName) && this.state.poolsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }

    const updated: Pool = {
      ...pool,
      name: updateName,
      minDeposit: updateMinDeposit,
      maxDeposit: updateMaxDeposit,
      timestamp: this.blockHeight,
    };
    this.state.pools.set(id, updated);
    this.state.poolsByName.delete(pool.name);
    this.state.poolsByName.set(updateName, id);
    this.state.poolUpdates.set(id, {
      updateName,
      updateMinDeposit,
      updateMaxDeposit,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }

  addToPool(poolId: number, amount: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (!pool.status) return { ok: false, value: ERR_INVALID_STATUS };
    if (amount < pool.minDeposit) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (pool.totalDeposited + amount > pool.maxDeposit) return { ok: false, value: ERR_POOL_FULL };
    const userKey = `${poolId}-${this.caller}`;
    const existingShare = this.state.userShares.get(userKey) || { shares: 0, depositTime: 0, lastClaim: 0 };
    if (existingShare.shares > 0) return { ok: false, value: ERR_ALREADY_IN_POOL };
    this.contractBalance += amount;
    const newShares = amount;
    this.state.userShares.set(userKey, { shares: newShares, depositTime: this.blockHeight, lastClaim: this.blockHeight });
    this.state.pools.set(poolId, { ...pool, totalDeposited: pool.totalDeposited + amount, totalShares: pool.totalShares + newShares });
    return { ok: true, value: true };
  }

  removeFromPool(poolId: number): Result<number> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    const userKey = `${poolId}-${this.caller}`;
    const share = this.state.userShares.get(userKey);
    if (!share) return { ok: false, value: ERR_NOT_IN_POOL };
    if (!pool.status) return { ok: false, value: ERR_INVALID_STATUS };
    if (this.blockHeight - share.depositTime < pool.lockPeriod) return { ok: false, value: ERR_LOCKED_FUNDS };
    const amount = share.shares;
    const penaltyAmount = (amount * pool.penalty) / 100;
    const withdrawAmount = amount - penaltyAmount;
    this.contractBalance -= withdrawAmount;
    this.state.userShares.delete(userKey);
    this.state.pools.set(poolId, { ...pool, totalDeposited: pool.totalDeposited - amount, totalShares: pool.totalShares - amount });
    return { ok: true, value: withdrawAmount };
  }

  deployToDefi(poolId: number): Result<boolean> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    if (pool.creator !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (pool.totalDeposited < pool.threshold) return { ok: false, value: ERR_INVALID_THRESHOLD };
    return { ok: true, value: true };
  }

  claimYield(poolId: number): Result<number> {
    const pool = this.state.pools.get(poolId);
    if (!pool) return { ok: false, value: ERR_POOL_NOT_FOUND };
    const userKey = `${poolId}-${this.caller}`;
    const share = this.state.userShares.get(userKey);
    if (!share) return { ok: false, value: ERR_NOT_IN_POOL };
    if (!pool.status) return { ok: false, value: ERR_INVALID_STATUS };
    const timeElapsed = this.blockHeight - share.lastClaim;
    const yieldAmount = (share.shares * pool.yieldRate * timeElapsed) / (100 * 144);
    this.contractBalance -= yieldAmount;
    this.state.userShares.set(userKey, { ...share, lastClaim: this.blockHeight });
    return { ok: true, value: yieldAmount };
  }

  getPoolCount(): Result<number> {
    return { ok: true, value: this.state.nextPoolId };
  }

  checkPoolExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.poolsByName.has(name) };
  }
}

describe("PoolManager", () => {
  let contract: PoolManagerMock;

  beforeEach(() => {
    contract = new PoolManagerMock();
    contract.reset();
  });

  it("creates a pool successfully", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.createPool(
      "AlphaPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);

    const pool = contract.getPool(0);
    expect(pool?.name).toBe("AlphaPool");
    expect(pool?.minDeposit).toBe(100);
    expect(pool?.maxDeposit).toBe(10000);
    expect(pool?.yieldRate).toBe(5);
    expect(pool?.duration).toBe(30);
    expect(pool?.penalty).toBe(2);
    expect(pool?.threshold).toBe(50);
    expect(pool?.poolType).toBe("lending");
    expect(pool?.interestRate).toBe(10);
    expect(pool?.lockPeriod).toBe(7);
    expect(pool?.currency).toBe("STX");
    expect(pool?.defiProtocol).toBe("alex");
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects duplicate pool names", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "AlphaPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.createPool(
      "AlphaPool",
      200,
      20000,
      10,
      60,
      5,
      60,
      "staking",
      15,
      14,
      "BTC",
      "arkadiko"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_POOL_ALREADY_EXISTS);
  });

  it("rejects non-authorized caller", () => {
    contract.setDefiContract("ST2TEST");
    contract.caller = "ST2FAKE";
    contract.authorities = new Set();
    const result = contract.createPool(
      "BetaPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("rejects pool creation without defi contract", () => {
    const result = contract.createPool(
      "NoDefi",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DEFI_NOT_VERIFIED);
  });

  it("rejects invalid min deposit", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.createPool(
      "InvalidMin",
      0,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MIN_DEPOSIT);
  });

  it("rejects invalid pool type", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.createPool(
      "InvalidType",
      100,
      10000,
      5,
      30,
      2,
      50,
      "invalid",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_POOL_TYPE);
  });

  it("updates a pool successfully", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "OldPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.updatePool(0, "NewPool", 200, 20000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.name).toBe("NewPool");
    expect(pool?.minDeposit).toBe(200);
    expect(pool?.maxDeposit).toBe(20000);
    const update = contract.state.poolUpdates.get(0);
    expect(update?.updateName).toBe("NewPool");
    expect(update?.updateMinDeposit).toBe(200);
    expect(update?.updateMaxDeposit).toBe(20000);
    expect(update?.updater).toBe("ST1TEST");
  });

  it("rejects update for non-existent pool", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.updatePool(99, "NewPool", 200, 20000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("rejects update by non-creator", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.caller = "ST3FAKE";
    const result = contract.updatePool(0, "NewPool", 200, 20000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("sets creation fee successfully", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(1000);
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });

  it("rejects creation fee change without defi contract", () => {
    const result = contract.setCreationFee(1000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("returns correct pool count", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "Pool1",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.createPool(
      "Pool2",
      200,
      20000,
      10,
      60,
      5,
      60,
      "staking",
      15,
      14,
      "BTC",
      "arkadiko"
    );
    const result = contract.getPoolCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });

  it("checks pool existence correctly", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.checkPoolExistence("TestPool");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkPoolExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });

  it("parses pool parameters with Clarity types", () => {
    const name = stringUtf8CV("TestPool");
    const minDeposit = uintCV(100);
    const maxDeposit = uintCV(10000);
    expect(name.value).toBe("TestPool");
    expect(minDeposit.value).toEqual(BigInt(100));
    expect(maxDeposit.value).toEqual(BigInt(10000));
  });

  it("rejects pool creation with empty name", () => {
    contract.setDefiContract("ST2TEST");
    const result = contract.createPool(
      "",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });

  it("rejects pool creation with max pools exceeded", () => {
    contract.setDefiContract("ST2TEST");
    contract.state.maxPools = 1;
    contract.createPool(
      "Pool1",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.createPool(
      "Pool2",
      200,
      20000,
      10,
      60,
      5,
      60,
      "staking",
      15,
      14,
      "BTC",
      "arkadiko"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_POOLS_EXCEEDED);
  });

  it("sets defi contract successfully", () => {
    const result = contract.setDefiContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.defiContract).toBe("ST2TEST");
  });

  it("rejects invalid defi contract", () => {
    const result = contract.setDefiContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });

  it("adds to pool successfully", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.addToPool(0, 500);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const pool = contract.getPool(0);
    expect(pool?.totalDeposited).toBe(500);
    expect(pool?.totalShares).toBe(500);
    const userKey = `0-${contract.caller}`;
    const share = contract.state.userShares.get(userKey);
    expect(share?.shares).toBe(500);
    expect(share?.depositTime).toBe(0);
    expect(share?.lastClaim).toBe(0);
  });

  it("rejects add to pool with invalid amount", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.addToPool(0, 50);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_AMOUNT);
  });

  it("rejects add to pool when already in pool", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 500);
    const result = contract.addToPool(0, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_IN_POOL);
  });

  it("removes from pool successfully", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 500);
    contract.blockHeight = 10;
    const result = contract.removeFromPool(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(490);
    const pool = contract.getPool(0);
    expect(pool?.totalDeposited).toBe(0);
    expect(pool?.totalShares).toBe(0);
    const userKey = `0-${contract.caller}`;
    expect(contract.state.userShares.has(userKey)).toBe(false);
  });

  it("rejects remove from pool when locked", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 500);
    contract.blockHeight = 5;
    const result = contract.removeFromPool(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_LOCKED_FUNDS);
  });

  it("deploys to defi successfully", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 5000);
    const result = contract.deployToDefi(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
  });

  it("rejects deploy to defi below threshold", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 40);
    const result = contract.deployToDefi(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_THRESHOLD);
  });

  it("claims yield successfully", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    contract.addToPool(0, 500);
    contract.blockHeight = 144;
    const result = contract.claimYield(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(25);
    const userKey = `0-${contract.caller}`;
    const share = contract.state.userShares.get(userKey);
    expect(share?.lastClaim).toBe(144);
  });

  it("rejects claim yield not in pool", () => {
    contract.setDefiContract("ST2TEST");
    contract.createPool(
      "TestPool",
      100,
      10000,
      5,
      30,
      2,
      50,
      "lending",
      10,
      7,
      "STX",
      "alex"
    );
    const result = contract.claimYield(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_IN_POOL);
  });
});