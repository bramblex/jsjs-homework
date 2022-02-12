const customerEval = require("./eval");

function throwError() {
  throw new Error("error");
}

const baseEnv = { throwError };

test("控制流 - 初级挑战", () => {
  const sourceCodeList = [
    "(() => { let a = 3; if (a > 0) { return 1 } else { return 0 } })()",
    "(() => { let sum = 0; for (let i = 0; i < 10; i++) { sum += i } return sum })()",
    "(() => { let factorial = 1; let i = 0; while (i < 10) { factorial *= i; i++; } return factorial })()",
  ];
  for (sourceCode of sourceCodeList) {
    expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
  }
});
test("声明 - 初级挑战", () => {
  const sourceCodeErrorMap = {
    "var a = 1;let b = 2;const c = 3": undefined,
    "var a = 1; var a = 2;": undefined,
    "const a = 1; a = 5;": new TypeError("Assignment to constant variable"),
  };
  for (const [sourceCode, err] of Object.entries(sourceCodeErrorMap)) {
    if (err === undefined) {
      expect(customerEval(sourceCode)).toBe(undefined);
    } else {
      expect(() => customerEval(sourceCode)).toThrowError(err);
    }
  }
});

test("测试声明与控制流 - 终极挑战", () => {
  const sourceCodeList = [
    "(() => { let a = 1; var b = 2; (() => { a = 2; b = 3; })(); return { a, b }; })()",
    "((() => { var n = 55; return () => { for (let i = 0; i < 10; i++) { n += i } return n } })())()",
    `(() => {
      const obj = {
        runTry: false,
        runError: false,
        runFinally: false,
        errorMsg: null,
      }
      try {
        obj.runTry = true
        throw 'wow'
      } catch (err) {
        obj.errorMsg = err
        obj.runError = true
        return obj
      } finally {
        obj.runFinally = true
      }
    })()`,
    '(function t(type) { const result = []; let i = 0; while (i < 5) { i++; switch (type + "") { case "0": continue; }result.push(i); } return result; })(0)',
  ];
  for (const sourceCode of sourceCodeList) {
    expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
  }
});

test("测试声明与控制流 - 超纲挑战", () => {
  const sourceCode =
    "(() => { loop1: for (var i = 0; i < 3; i++) { loop2: for (var m = 1; m < 3; m++) { if (m % 2 === 0) { break loop1; } loop3: for (var y = 1; y < 10; y++) { if (y % 5 === 0) { continue loop2; } } } } return { i, m, y } })()";
  expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
});

test("测试循环/New - 初级测试", () => {
  const sourceCode = `(function a(){
      let a = new Number(10);
      do {
        a--;
        debugger;
      }while(a)
      for(var num of [1,2,3]){
        a += num;
      }
      return a--;
      })()`;
  expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
});

test.skip("测试This/With - 初级测试", () => {
  const sourceCode = `(function f(){
      let b = 1;
      let a = {
        b:2,
        c: ()=>{
          this.b += 1
        },
        d: function() {
          this.b += 1
        }
      }
      a.c();
      a.d();
      return {a,b};
    })()`;
  expect(customerEval(sourceCode)).toStrictEqual(eval(sourceCode));
});
