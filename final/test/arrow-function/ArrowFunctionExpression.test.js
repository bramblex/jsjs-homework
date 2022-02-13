const test = require('ava');
const { Scope, customEval } = require('../../eval');

test("ArrowFunctionExpression-1", t => {
  const scope = new Scope({
    name: "world"
  });

  const func = customEval(
    `
const func = () => {
  return "hello " + name;
};

module.exports = func;
  `,
    scope
  );

  t.true(typeof func === "function");
  t.deepEqual(func.length, 0);
  t.deepEqual(func(), "hello world");
});

test("ArrowFunctionExpression-2", t => {
  const scope = new Scope();

  const func = customEval(
    `
const func = () => "hello " + this;

module.exports = func;
  `,
    scope
  );

  t.true(typeof func === "function");
  t.deepEqual(func.length, 0);
  t.deepEqual(func.name, "");
  t.deepEqual(func(), "hello undefined");
});

test("ArrowFunctionExpression-3", t => {
  const scope = new Scope();

  const func = customEval(
    `
function main() {
  return () => {
    return "hello " + this.name;
  };
}

function call(name) {
  return main.call({name: name})();
}

module.exports = call;
  `,
    scope
  );

  t.true(typeof func === "function");
  t.deepEqual(func.length, 1);
  t.deepEqual(func("world"), "hello world");
  t.deepEqual(func("axetroy"), "hello axetroy");
});
