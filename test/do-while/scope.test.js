const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("DoWhileStatement var in do block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

do {
  var a = 2; // parent scope have a = 1, here is the child scope
} while (false);

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("DoWhileStatement let in do block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

do {
  let a = 2;  // define in his own scope
  b = a;
} while (false)

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("DoWhileStatement const in do block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

do {
  const a = 2;  // define in his own scope
  b = a;
} while (false)

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("var in do block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = 1;  // define let var

do{
  var a = 2;  // define var, it should throw
}while(false)

module.exports = {a: a};
    `,
      scope
    );
  });
});
