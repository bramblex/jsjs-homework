const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("VariableDeclaration-var", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 123;

module.exports = a;
  `,
    scope
  );

  t.deepEqual(a, 123);
});

test("VariableDeclaration-duplicate-var", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 123;

var a = 321;

module.exports = a;
  `,
    scope
  );

  t.deepEqual(a, 321);
});

test("VariableDeclaration-duplicate-with-context-var", t => {
  const scope = new Scope({
    global: "hello"
  });

  const g = customEval(
    `
var global = "world"  // context can not be rewrite
module.exports = global;
    `,
    scope
  );

  t.deepEqual(g, "hello");
});

test("VariableDeclaration-replace-context-var", t => {
  const scope = new Scope({
    global: "hello"
  });

  const g = customEval(
    `
function test(){
  let global = 123;
  return global;
}
module.exports = test();
    `,
    scope
  );
  t.deepEqual(g, 123);
});

test("VariableDeclaration-define global var", t => {
  const scope = new Scope({
    global: "hello"
  });

  const output = customEval(
    `
name = "axetroy"
module.exports = {name: name, global}
    `,
    scope
  );
  t.deepEqual(output.global, "hello");
  t.deepEqual(output.name, "axetroy");
});

test("VariableDeclaration-define var then cover value", t => {
  const scope = new Scope();

  const output = customEval(
    `
var name = "hello"
name = "world"  // cover the name var
module.exports = {name: name}
    `,
    scope
  );
  t.deepEqual(output.name, "world");
});

test("VariableDeclaration-define global var in block scope", t => {
  const scope = new Scope();

  const func = customEval(
    `
function run(){
  name = "world";
  return name;
}

module.exports = run;
      `,
    scope
  );

  t.deepEqual(func(), "world");
});

test("VariableDeclaration-redefine global var in block scope", t => {
  const scope = new Scope();

  const func = customEval(
    `
function run(){
  name = "world";
  name = "hello";
  return name;
}

module.exports = run;
      `,
    scope
  );

  t.deepEqual(func(), "hello");
});

test("VariableDeclaration-continuous-define continuous assignment", t => {
  const scope = new Scope();

  const { a, b } = customEval(
    `
var a = {n: 2};
var b = a;
a.x = a = {n: 1};
module.exports = {a, b};
      `,
    scope
  );

  t.deepEqual(a.n, 1);
  t.deepEqual(b.n, 2);
  t.deepEqual(b.x, a);
});
