const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("ThisExpression", t => {
  const scope = new Scope();

  const func = customEval(
    `
function t(){
  this.name = "hello";
  return this;
}

module.exports = t;
  `,
    scope
  );

  const ctx = {};

  func.call(ctx);

  t.deepEqual(ctx.name, "hello");
});
