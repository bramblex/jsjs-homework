const test = require('ava');

const { customEval, Scope } = require('../../eval');

test("ArrayExpression-1", t => {
  const scope = new Scope();

  const arr = customEval(
    `
const arr = [1, 2, 3];
arr.push(4);

module.exports = arr;
  `,
    scope
  );

  t.true(Array.isArray(arr));
  t.deepEqual(arr.length, 4);
  t.deepEqual(arr, [1, 2, 3, 4]);
});

test("ArrayExpression-2", t => {
  const scope = new Scope();

  const arr = customEval(
    `
const arr = [1, 2, 3  + 3];
arr.push(4);

module.exports = arr;
  `,
    scope
  );

  t.true(Array.isArray(arr));
  t.deepEqual(arr.length, 4);
  t.deepEqual(arr, [1, 2, 6, 4]);
});

test("ArrayExpression-with-undefined", t => {
  const scope = new Scope();

  const arr = customEval(
    `
module.exports = [1, 2, undefined, 4];
  `,
    scope
  );

  t.true(Array.isArray(arr));
  t.deepEqual(arr.length, 4);
  t.deepEqual(arr, [1, 2, undefined, 4]);
});

test("ArrayExpression-with-null", t => {
  const scope = new Scope();

  const arr = customEval(
    `
module.exports = [1, 2, undefined, null];
  `,
    scope
  );

  t.true(Array.isArray(arr));
  t.deepEqual(arr.length, 4);
  t.deepEqual(arr, [1, 2, undefined, null]);
});
