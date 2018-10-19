import { toBeDeepCloseTo } from 'jest-matcher-deep-close-to';

import levenbergMarquardt from '..';
import * as errCalc from "../errorCalculation";

expect.extend({ toBeDeepCloseTo });

function fourParamEq([a, b, c, d]) {
  return (t) => a + (b - a) / (1 + Math.pow(c, d) * Math.pow(t, -d));
}

function bennet5([b1, b2, b3]) {
  return (t) => b1 * Math.pow(t + b2, -1 / b3);
}

const data = {
  x: [
    9.22e-12,
    5.53e-11,
    3.32e-10,
    1.99e-9,
    1.19e-8,
    7.17e-8,
    4.3e-7,
    0.00000258,
    0.0000155,
    0.0000929
  ],
  y: [7.807, -3.74, 21.119, 2.382, 4.269, 41.57, 73.401, 98.535, 97.059, 92.147]
};

const bennett5Parameter = [2, 3, 5];
let bennet5Func = bennet5(bennett5Parameter);
let bennet5XData = new Array(154).fill(0).map((_, i) => -3 + (i + 1) * 0.3419);
let bennett5YData = bennet5XData.map((e) => bennet5Func(e));

const bennet5Data = {
  x: bennet5XData,
  y: bennett5YData
};



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
});

test('Bennet5 problem', () => {
  const options = {
    damping: 0.00001,
    maxIterations: 1000,
    errorTolerance: 1e-3,
    minValues: [1, 1, 1],
    maxValues: [11, 11, 11],
    initialValues: [3.5, 3.8, 4]
  };

  let result = levenbergMarquardt(bennet5Data, bennet5, options);
  expect(result.parameterValues).toBeDeepCloseTo(bennett5Parameter, 3);
});

test('fourParamEq', () => {
  const options = {
    damping: 0.0001,
    maxIterations: 200,
    minValues: [-Infinity, -Infinity, 0, -Infinity],
    initialValues: [0, 100, 1, 0.1]
  };

  // TODO: Document where these values come from / why they are correct
  expect(levenbergMarquardt(data, fourParamEq, options)).toBeDeepCloseTo({
    parameterValues: [
      -32.0049530120509,
      143.62056670443766,
      1.8538886934094637e-7,
      0.2715460299471644
    ],
    residuals: 2913.145671022668,
    iterations: 200,
    parameterError: 2913.145671022668
  }, 3);
});

test('error is NaN', () => {
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
