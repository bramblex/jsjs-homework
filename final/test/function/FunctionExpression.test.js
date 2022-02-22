const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("FunctionExpression-1", t => {
  const scope = new Scope();

  const testFunc = customEval(
    `
function test(name){
  return "hello " + name;
}

module.exports = test;
  `,
    scope
  );

  t.true(typeof testFunc === "function");
  t.deepEqual(testFunc.length, 1);
  t.deepEqual(testFunc.name, "test");
  t.deepEqual(testFunc("world"), "hello world");
});

test("FunctionDeclaration-2", t => {
  const scope = new Scope();

  const testFunc = customEval(
    `
const func = function test(name){
  return "hello " + name;
}

module.exports = func;
  `,
    scope
  );

  t.true(typeof testFunc === "function");
  t.deepEqual(testFunc.length, 1);
  t.deepEqual(testFunc.name, "test");
  t.deepEqual(testFunc("world"), "hello world");
});

test("FunctionDeclaration-name", t => {
  const scope = new Scope();

  const person = customEval(
    `
const person = {
  sayName() {
    console.log('hello!');
  },
};

module.exports = person;
  `,
    scope
  );

  t.deepEqual(person.sayName.name, "sayName");
});

test("invalid function call", t => {
  const scope = new Scope();

  t.throws(() => {
    customEval(
      `
  const a = 123;
  
  module.exports = a(); // a is not a function
    `,
      scope
    );
  });
});

test("object-property function call name", t => {
  const scope = new Scope();

  t.throws(() => {
    customEval(
      `
var obj = {};
obj["a"]();
    `,
      scope
    );
  });
});

test("function params should can be overwrite", t => {
  const scope = new Scope();

  const test = customEval(
    `
function test (a) {
  a = a || 'hello'
  return a
}

module.exports = test
    `,
    scope
  );

  t.deepEqual(test(), "hello");
});
