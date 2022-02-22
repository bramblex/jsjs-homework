const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("var in if block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

if (true){
  var a = 2;
}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("let in if block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

if (true){
  let a = 2;
  b = a;
}

module.exports = { a: a, b: b };
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("const in if block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

if (true){
  const a = 2;
  b = a;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("var in if block and parent scope let some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = 1;  // define let var
let b;

if (true){
  var a = 2;
}

module.exports = {a: a};
    `,
      scope
    );
  });
});

test("var in for block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
const a = 1;  // define let var

if (true){
  var a = 1;
}

module.exports = {a: a};
    `,
      scope
    );
  });
});
