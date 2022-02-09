const ocp = require('../ocp');

test('optimizePerformanceMetrics', () => {
  expect(ocp.optimizePerformanceMetrics()).toMatchInlineSnapshot();
});