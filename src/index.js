import { initializeErrorPropagation, sumOfSquaredResiduals } from './errorCalculation';
import step from './step';
import * as legacy from './legacy';

/**
 * @typedef {Object} Result
 * @property {Array<number>} parameterValues - The computed values of parameters
 * @property {number} residuals - Sum of squared residuals of the final fit
 * @property {number} iterations - Number of iterations used
 */

/**
 * Curve fitting algorithm
 * @param {{x:Array<number>, y:Array<number>, xError:Array<number>|void, yError:Array<number>|void}} data - Array of points to fit in the format [x1, x2, ... ], [y1, y2, ... ]
 * @param {(number[]) => (x: number) => number} paramFunction - Takes the parameters and returns a function with the independent variable as a parameter
 * @param {object} [options] - Options object
 * @param {number} [options.damping = 0.1] - Levenberg-Marquardt lambda parameter
 * @param {number} [options.dampingDrop = 0.1] - The constant used to lower the damping parameter
 * @param {number} [options.dampingBoost = 1.5] - The constant used to increase the damping parameter
 * @param {number} [options.maxDamping] - Maximum value for the damping parameter
 * @param {number} [options.minDamping] - Minimum value for the damping parameter
 * @param {number} [options.gradientDifference = 1e-6] - The "infinitesimal" value used to approximate the gradient of the parameter space
 * @param {Array<number>} [options.minValues] - Minimum allowed values for parameters
 * @param {Array<number>} [options.maxValues] - Maximum allowed values for parameters
 * @param {Array<number>} [options.initialValues] - Array of initial parameter values
 * @param {number} [options.maxIterations = 100] - Maximum of allowed iterations
 * @param {number} [options.residualEpsilon = 1e-6] - Minimum change of the sum of residuals per step – if the sum of residuals changes less than this number, the algorithm will stop
 * @param {number} [options.errorPropagation = 50] - How many evaluations (per point per step) of the fitted function to use to approximate the error propagation through it
 * @return {Result}
 */
export default function levenbergMarquardt(
  data,
  paramFunction,
  options = {}
) {
  let {
    damping = 0.1,
    dampingDrop = 0.1,
    dampingBoost = 1.5,
    minDamping = Number.EPSILON,
    maxDamping = Number.MAX_SAFE_INTEGER,
    gradientDifference = 1e-6,
    minValues,
    maxValues,
    initialValues,
    maxIterations = 100,
    residualEpsilon = 1e-6,
    errorPropagation = 50,
  } = legacy.compatOptions(options);

  if (damping <= 0) {
    throw new Error('The damping option must be a positive number');
  } else if (!data || !data.x || !data.y) {
    throw new Error('The data object must have x and y elements');
  } else if (
    !Array.isArray(data.x) ||
    data.x.length < 2 ||
    !Array.isArray(data.y) ||
    data.y.length < 2
  ) {
    throw new Error(
      'The data must have more than 2 points'
    );
  } else if (data.x.length !== data.y.length) {
    throw new Error('The data object must have equal number of x and y coordinates');
  }

  let params = initialValues || new Array(paramFunction.length).fill(1);
  if (!Array.isArray(params)) {
    throw new Error('initialValues must be an array');
  }
  const parLen = params.length;
  maxValues = maxValues || new Array(parLen).fill(Number.MAX_SAFE_INTEGER);
  minValues = minValues || new Array(parLen).fill(Number.MIN_SAFE_INTEGER);
  if (maxValues.length !== minValues.length) {
    throw new Error('minValues and maxValues should be the same size');
  }

  initializeErrorPropagation(errorPropagation);

  const numberOfResidualsToConsider = 10;
  let residualDifferences = Array(numberOfResidualsToConsider).fill(NaN);

  let residuals = sumOfSquaredResiduals(data, params, paramFunction);
  let converged = false;

  let iteration = 0;
  while (iteration < maxIterations && !converged) {
    let params2 = step(
      data,
      params,
      damping,
      gradientDifference,
      paramFunction
    );

    // limit parameters to be within bounds set by minValues & maxValues
    for (let k = 0; k < parLen; k++) {
      params2[k] = Math.min(
        Math.max(minValues[k], params2[k]),
        maxValues[k]
      );
    }

    let residuals2 = sumOfSquaredResiduals(data, params2, paramFunction);

    if (isNaN(residuals2)) throw new Error(`The function evaluated to NaN.\r\n  f = ${paramFunction(params2).toString()}\r\n  p = ${params2}\r\n  x = ${data.x}`);

    if (residuals2 < residuals) {
      params = params2;
      residuals = residuals2;
      damping *= dampingDrop;
    } else {
      damping *= dampingBoost;
    }

    damping = Math.max( minDamping, Math.min(maxDamping, damping) );

    residualDifferences.shift();
    residualDifferences.push( Math.abs(residuals - residuals2) );
    const maxEpsilon = residualDifferences.reduce((a, b) => Math.max(a, b));
    converged = maxEpsilon <= residualEpsilon;
    iteration++;
  }

  /** @type {Result} */
  let result = {
    parameterValues: params,
    residuals: sumOfSquaredResiduals(data, params, paramFunction),
    iterations: iteration
  };

  return legacy.compatReturn(result);
}
