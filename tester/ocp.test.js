const ocp = require('../ocp');

describe('ocp', () => {
  beforeAll(() => {
    ocp.fakeInit([]);
  });

  test('optimizePerformanceMetrics', () => {
    expect(ocp.optimizePerformanceMetrics()).toMatchInlineSnapshot();
  });
});
