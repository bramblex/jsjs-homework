const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("var in for block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

var arr = [1, 2, 3];

for (let i = 0; i < arr.length; i++) {
  var a = arr[i]; // cover parent scope
}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 3);
});

test("let in for block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

const arr = [1, 2, 3];

for (let i = 0; i < arr.length; i++) {
  let a = arr[i]; // define in his block scope
  b = a;
}

module.exports = { a: a, b: b };
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 3);
});

test("const in for block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

const arr = [1, 2, 3];

for (let i = 0; i < arr.length; i++) {
  const a = arr[i]; // define in his block scope
  b = a;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 3);
});

test("var in for block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = 1;  // define let var

const arr = [1, 2, 3];

for (let i = 0; i < arr.length; i++) {
  let a = i;
  let a = 0;  // it should throw an error
}

module.exports = {a: a};
    `,
      scope
    );
  });
});
