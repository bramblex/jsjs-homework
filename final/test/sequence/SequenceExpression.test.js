const test = require('ava');

const { customEval, Scope } = require('../../eval');

test("basic", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = (1 , 2);

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("with call expression", t => {
  const scope = new Scope();

  const { a, b } = customEval(
    `
var a = (get() , 2);
var b;

function get(){
  b = 3;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(a, 2);
  t.deepEqual(b, undefined);
});