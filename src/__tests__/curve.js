import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

import levenbergMarquardt from '..';

expect.extend({ toBeDeepCloseTo });

describe('Example problems', () => {
  it('Should fit 2*sin(3*t)', () => {
    const getFunction = ([a, b]) => (t => a * Math.sin(b * t));
    const n = 50;
    const xs = new Array(n).fill(0).map((zero, i) => (i * 2 * Math.PI) / (n - 1)); // [0, ..., 2pi].length = n
    const exactParameters = [2, 3];
    const data = {
      x: xs,
      y: xs.map(getFunction(exactParameters))
    };

    const options = {
      maxIterations: 100,
      residualEpsilon: 0, // force maximum iterations
      damping: 0.1,
      initialValues: [1, 1]
    };
    const actual = levenbergMarquardt(data, getFunction, options);
    expect(actual.parameterValues).toBeDeepCloseTo(exactParameters, 1);
  });

  it('Should fit bennet5([2, 3, 5])', () => {
    const getFunction = ([b1, b2, b3]) => (t => b1 * Math.pow(t + b2, -1 / b3));
    const n = 154;
    const xs = new Array(n).fill(0).map((zero, i) => -2.9 + i * (53 + 2.9) / (n - 1)); // [-2.9, ..., 53].length = n
    const exactParameters = [2, 3, 5];
    const data = {
      x: xs,
      y: xs.map(getFunction(exactParameters))
    };

    const options = {
      minValues: [1, 3 + 1e-15, 1],
      maxValues: [11, 11, 11],
      initialValues: [3.5, 3.8, 4]
    };
    const actual = levenbergMarquardt(data, getFunction, options);
    expect(actual.parameterValues).toBeDeepCloseTo(exactParameters, 3);
  });

  it('Should fit raw data to fourParamEq', () => {

    const getFunction = ([a, b, c, d]) => (t => a + (b - a) / (1 + Math.pow(c, d) * Math.pow(t, -d)));
    /*
    const n = 154;
    const xs = new Array(n).fill(0).map((zero, i) => -2.9 + i * (53 + 2.9) / (n - 1)); // [-2.9, ..., 53].length = n
    const exactParameters = [2, 3, 5];
    const data = {
      x: xs,
      y: xs.map(getFunction(exactParameters))
    };
    */
    const data = {
      x: [9.22e-12, 5.53e-11, 3.32e-10, 1.99e-9, 1.19e-8, 7.17e-8, 4.3e-7, 0.00000258, 0.0000155, 0.0000929],
      y: [7.807, -3.74, 21.119, 2.382, 4.269, 41.57, 73.401, 98.535, 97.059, 92.147]
    };

    const options = {
      damping: 0.0001,
      maxIterations: 200,
      minValues: [-Infinity, -Infinity, 0, -Infinity],
      initialValues: [0, 100, 1, 0.1]
    };

    // TODO: Document where these values come from / why they are correct
    const expectedParameters = [-32.0049530120509, 143.62056670443766, 1.8538886934094637e-7, 0.2715460299471644];
    const actual = levenbergMarquardt(data, getFunction, options);
    expect(actual.parameterValues).toBeDeepCloseTo(expectedParameters, 3);
  });
});

describe('Handling of ill-behaved functions', () => {
  it('Should throw an error if function evaluates to NaN', () => {
    // TODO: Make this test unrelated to fourParamEq
    const fourParamEq = ([a, b, c, d]) => (t => a + (b - a) / (1 + Math.pow(c, d) * Math.pow(t, -d)));
    const data = {
      x: [9.22e-12, 5.53e-11, 3.32e-10, 1.99e-9, 1.19e-8, 7.17e-8, 4.3e-7, 0.00000258, 0.0000155, 0.0000929],
      y: [7.807, -3.74, 21.119, 2.382, 4.269, 41.57, 73.401, 98.535, 97.059, 92.147]
    };
    const options = {
      damping: 0.01,
      maxIterations: 200,
      initialValues: [0, 100, 1, 0.1]
      // these initialValues are OK but the increased damping option leads to a case where
      // c < 0 && d is not an integer so Math.pow(c, d) is NaN
    };

    try {
      levenbergMarquardt(data, fourParamEq, options);
    } catch (e) {
      expect(e.message).toMatch('The function evaluated to NaN.');
    }
  });
});
