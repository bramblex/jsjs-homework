const customerEval = require('./eval');

function throwError() {
  throw new Error('error')
}

const baseEnv = { throwError }

// ensure result & err equal
const safeEval = (code) => {
  try {
    return [eval(code)]
  } catch (error) {
    return [undefined, `${error}`]
  }
}
const safeCustomEval = (code, env) => {
  try {
    return [customerEval(code, env)]
  } catch (error) {
    // normalize acorn err msg
    return [undefined, `${error}`.replace(/\s\(\d+:\d+\)$/, '')]
  }
}

test('测试声明与控制流 - 初级挑战', () => {
  const sourceCodeList = [
    'var a = 1;let b = 2;const c = 3',
    '(() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })()',
    '(() => { let sum = 0; for (let i = 0; i < 10; i++) { sum += i } return sum })()',
    '(() => { let factorial = 1; let i = 0; while (i < 10) { factorial *= i; i++; } return factorial })()',
    'var a = 1; var a = 2;',
    'let b = 1; let b = 2;',
    'const a = 1; a = 5;',
    'const a = 1; let a = 5;'
    ];
  for (sourceCode of sourceCodeList) {
    expect(safeCustomEval(sourceCode, baseEnv)).toStrictEqual(safeEval(sourceCode));
  }
})

test('测试声明与控制流 - 终极挑战', () => {
  const sourceCodeList = [
    '(() => { let a = 1; var b = 2; (() => { a = 2; b = 3; })(); return { a, b }; })()',
    '((() => { var n = 55; return () => { for (let i = 0; i < 10; i++) { n += i } return n } })())()',
    'const obj = { runTry: false, runError: false, runFinally: false }; try { obj.runTry = true; } catch (err) { obj.runError = true; } finally { obj.runFinally = true; }',
    '(function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0)',
    // add test case
    '(() => { let a = 1; var b = 2; {let a = 2; var b = 3;} return { a, b }; })()',
    'const obj = { runTry: false, runError: false, runFinally: false }; try { obj.runTry = true; } catch (err) { obj.runError = true; } finally { obj.runFinally = true; } obj',
    'const obj = { runTry: false, runError: false, runFinally: false }; try { obj.runTry = true; throw new Error(233);} catch (err) { obj.runError = err; } finally { obj.runFinally = true; } obj',
  ]
  for (sourceCode of sourceCodeList) {
    expect(safeCustomEval(sourceCode, baseEnv)).toStrictEqual(safeEval(sourceCode));
  }
})

test('测试声明与控制流 - 超纲挑战', () => {
  const sourceCode = '(() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })()'
  expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
})