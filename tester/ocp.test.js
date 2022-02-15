const ocp = require('../ocp');
const { performScheduling, getRatesAtHackLevel, getNetworkStats } = require('../ocp');
const { noodles, player } = require('./StaticValues');

const mockNs = {
  getServer: () => noodles,
  getServerRequiredHackingLevel: () => noodles.requiredHackingSkill,
  getServerMoneyAvailable: () => noodles.moneyAvailable,
  getServerSecurityLevel: () => noodles.hackDifficulty,
  hasRootAccess: () => noodles.hasAdminRights,
  getServerUsedRam: () => noodles.ramUsed,
  getWeakenTime: () => 1,
  getHackTime: () => 1,
  getGrowTime: () => 1,
  formulas: {
    hacking: {
      weakenTime: () => 8000,
      growTime: () => 7000,
      hackTime: () => 1000,
      hackPercent: () => 0.001,
      growPercent: () => 0.0001,
      hackChance: () => 1,
      hackExp: () => 0.000001
    }
  }
};

describe('ocp', () => {
  beforeAll(() => {
    ocp.fakeInit(mockNs, [], player);
  });

  test('getRatesAtHackLevel', () => {
    expect(ocp.getRatesAtHackLevel(mockNs, noodles, player, 1, 64)).toMatchInlineSnapshot(`
Array [
  775.0263946437985,
  775.0263946437985,
  4.601769911504425e-7,
]
`);
  });

  test('buildServerObject', () => {
    expect(ocp.buildServerObject(mockNs, 'n00dles')).toMatchSnapshot();
  });

  test('getNetworkStats', () => {
    expect(ocp.getNetworkStats()).toMatchInlineSnapshot(`
Object {
  "listOfServersFreeRam": Array [],
  "totalFreeRam": 0,
  "totalMaxRam": 0,
  "totalUsedRam": 0,
}
`);
  });

  test('getPerformanceSnapshot', () => {
    expect(ocp.getPerformanceSnapshot(ocp.buildServerObject(mockNs, 'n00dles'), ocp.getNetworkStats())).toMatchInlineSnapshot(`
Object {
  "canBeScheduled": false,
  "maxCompleteCycles": 1,
  "optimalPacedCycles": 1,
  "percentageToSteal": 0,
}
`);
  });

  test('optimizePerformanceMetrics', () => {
    expect(ocp.optimizePerformanceMetrics(ocp.buildServerObject(mockNs, 'n00dles'))).toMatchInlineSnapshot();
  });

  test('performScheduling', () => {
    expect(ocp.performScheduling()).toMatchInlineSnapshot();
  });
});
