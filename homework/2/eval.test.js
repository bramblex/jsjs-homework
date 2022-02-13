const customerEval = require('./eval');
const test = require('ava');

function throwError() {
  throw new Error('error')
}

const baseEnv = { throwError }

test('测试表达式 - 初级挑战', t => {
  const sourceCodeList = [
    '1 - 2 + 3 * 10 / 5',
    'true && true || throwError()',
    'false && throwError() || true',
    'true ? 1 : throwError()',
    'false ? throwError() : 2',
    '({ a: 1 + 2 + 3, b: 4 + 5, c: [1, 2, 3] })',
  ];
  for (sourceCode of sourceCodeList) {
    t.deepEqual(customerEval(sourceCode, baseEnv), eval(sourceCode));
  }
})

test('测试表达式 - 终极挑战', t => {
  const sourceCode = '(f => (x => f (y => x (x) (y))) (x => f (y => x(x)(y))))(f => n => n <= 1 ? n : n * f(n - 1))(10)'
  t.deepEqual(customerEval(sourceCode), eval(sourceCode))
})

test('测试表达式 - 超纲挑战(下节课会讲)', t => {
  const sourceCode = '(n => ((x => n = x)(n + 2), (y => n + y)(3)))(1)'
  t.deepEqual(customerEval(sourceCode), eval(sourceCode));
})