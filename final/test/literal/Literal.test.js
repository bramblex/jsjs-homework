const test = require('ava');

const { customEval, Scope } = require('../../eval');

test("Literal", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = {
  a: null,
  b: undefined,
  c: 0,
  d: "1",
  e: true
};
  `,
    scope
  );
  t.deepEqual(output, {
    a: null,
    b: undefined,
    c: 0,
    d: "1",
    e: true
  });
});
