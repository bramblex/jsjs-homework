const test = require('ava');
const { customEval, Scope } = require('../eval');

test("allown duplicate object key", t => {
  // TODO
  const scope = new Scope();
  const obj = customEval(
    `
  var obj = {
    a: 1,
    a: 2,
  };
  module.exports = obj;
      `,
    scope
  );
  t.deepEqual(Object.keys(obj).length, 1);
  t.deepEqual(obj.a, 2);
  t.pass();
});
