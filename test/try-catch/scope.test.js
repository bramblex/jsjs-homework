const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("var in try block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

try{
  var a = 2
}catch(err){

}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("var in catch block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

try{
  throw null;
}catch(err){
  var a = 2;
}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("let in try-catch block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

try{
  let a = 2;
  b = a;
}catch(err){
  
}

module.exports = { a: a, b: b };
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("const in try-catch block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = 1;
var b;

try{
  const a = 2;
  b = a;
}catch(err){
  
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, 1);
  t.deepEqual(obj.b, 2);
});

test("var in try-catch block and parent scope let some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = 1;  // define let var

try{
  var a = 2;
}catch(err){
  throw err;
}


module.exports = {a: a};
    `,
      scope
    );
  });
});

test("var in try-catch block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
const a = 1;  // define let var

try{
  var a = 2;
}catch(err){
  throw err;
}

module.exports = {a: a};
    `,
      scope
    );
  });
});
