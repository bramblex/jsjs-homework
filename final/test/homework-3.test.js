const test = require("ava");
const { customEval, Scope } = require("../eval");


test("测试声明与控制流 - 超纲挑战", t => {
    const scope = new Scope();

    const sourceCode =
        '(() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })()';
  
    const ans = customEval(
      `
      module.exports = (() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })()
      `,
      scope
    );
    t.deepEqual(ans, eval(sourceCode))
  });