const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("var in while block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;
while(true){
  var a = 2;
  break;
}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("let in for-in block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

while(true){
  let a = 2;
  b = a;
  break;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("const in for-in block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

while(true){
  const a = 2;
  b = a;
  break;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("var in for-in block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = 1;  // define let var

while(true){
  var a = 2;// throw
  break;
}
    `,
      scope
    );
  });
});
