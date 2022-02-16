const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("LogicalExpression-or-1", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 0 || 2;
  `,
    scope
  );

  t.deepEqual(num, 2);
});

test("LogicalExpression-or-2", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 1 || 2;
  `,
    scope
  );

  t.deepEqual(num, 1);
});

test("LogicalExpression-and-1", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 1 && 2;
  `,
    scope
  );

  t.deepEqual(num, 2);
});

test("LogicalExpression-and-2", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 0 && 2;
  `,
    scope
  );

  t.deepEqual(num, 0);
});
