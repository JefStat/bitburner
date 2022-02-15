const ocp = require('../ocp');
const { performScheduling, getRatesAtHackLevel } = require('../ocp');
const { noodles, player} = require('./StaticValues');

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

  test('optimizePerformanceMetrics', () => {
    expect(ocp.optimizePerformanceMetrics()).toMatchInlineSnapshot();
  });

  test('performScheduling', () => {
    expect(ocp.performScheduling()).toMatchInlineSnapshot();
  });
});
