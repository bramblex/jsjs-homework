const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("ConditionalExpression-1", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = true ? 1 : 2;
  `,
    scope
  );

  t.deepEqual(num, 1);
});

test("ConditionalExpression-or-2", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = false ? 1 : 2;
  `,
    scope
  );

  t.deepEqual(num, 2);
});

test("ConditionalExpression with function call", t => {
  const scope = new Scope();

  const num = customEval(
    `
function isOnline(){
  return true
}
module.exports = isOnline() ? 1 : 2;
  `,
    scope
  );

  t.deepEqual(num, 1);
});

test("ConditionalExpression in function call", t => {
  const scope = new Scope();

  const isAdult = customEval(
    `
function isAdult(age){
  return age >= 18 ? true : false
}
module.exports = isAdult;
  `,
    scope
  );

  t.deepEqual(isAdult(18), true);
  t.deepEqual(isAdult(17.999), false);
});
