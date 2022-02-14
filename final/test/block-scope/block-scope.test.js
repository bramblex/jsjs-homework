const test = require('ava');
const { Scope, customEval } = require('../../eval');

test("var don't have block scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 123;
var b;
{
  var b = 321;
}

module.exports = {a:a, b:b};
  `,
    scope
  );

  t.deepEqual(obj.a, 123);
  t.deepEqual(obj.b, 321);
});

test("let have block scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 123;
var b;
{
  let b = 321;
}

module.exports = {a:a, b:b};
  `,
    scope
  );

  t.deepEqual(obj.a, 123);
  t.deepEqual(obj.b, undefined);
});

test("let have block scope in the function", t => {
  const scope = new Scope();

  const abc = customEval(
    `
function abc(){
  var a = 123;
  var b;
  {
    let a = 321;
    b = a;
  }
  return {a: a, b: b};
}
module.exports = abc;
  `,
    scope
  );

  const r = abc();

  t.deepEqual(r.a, 123);
  t.deepEqual(r.b, 321);
});
