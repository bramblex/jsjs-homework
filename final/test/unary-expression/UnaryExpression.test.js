const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("typeof", t => {
  const scope = new Scope();

  const type = customEval(
    `
module.exports = typeof 123;
  `,
    scope
  );

  t.deepEqual(type, "number");
});

test("typeof before defined", t => {
  const scope = new Scope();

  const type = customEval(
    `

module.exports = typeof a; // a is not defined, it should equal 'undefined'
  `,
    scope
  );

  t.deepEqual(type, "undefined");
});

test("typeof before var", t => {
  const scope = new Scope();

  const type = customEval(
    `

module.exports = typeof a;
var a;
  `,
    scope
  );

  t.deepEqual(type, "undefined");
});

test("void", t => {
  const scope = new Scope();

  const type = customEval(
    `
module.exports = void 123;
  `,
    scope
  );

  t.deepEqual(type, undefined);
});

test("delete", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  a: 123
};

delete obj.a;

module.exports = obj;
  `,
    scope
  );

  t.deepEqual(obj.a, undefined);
  t.deepEqual(Object.keys(obj).length, 0);
});

test("!", t => {
  const scope = new Scope();

  const isTrue = customEval(
    `
const isTrue = !false;

module.exports = isTrue;
  `,
    scope
  );
  t.true(isTrue);
});

test("+", t => {
  const scope = new Scope();

  const num = customEval(
    `
const num = +("123");

module.exports = num;
  `,
    scope
  );
  t.deepEqual(num, 123);
});

test("-", t => {
  const scope = new Scope();

  const num = customEval(
    `
const num = -("123");

module.exports = num;
  `,
    scope
  );
  t.deepEqual(num, -123);
});

test("~", t => {
  const scope = new Scope();

  const num = customEval(
    `
const num = ~("123");

module.exports = num;
  `,
    scope
  );
  t.deepEqual(num, -124);
});
