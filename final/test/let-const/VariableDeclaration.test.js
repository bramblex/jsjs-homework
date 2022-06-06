const test = require('ava');
const { Scope, customEval } = require('../../eval');

test("VariableDeclaration-const", t => {
  const scope = new Scope({});

  const a = customEval(
    `
const a = 123;

module.exports = a;
  `,
    scope
  );

  t.deepEqual(a, 123);
});

test("VariableDeclaration-let", t => {
  const scope = new Scope({});

  const a = customEval(
    `
let a = 123;

module.exports = a;
  `,
    scope
  );

  t.deepEqual(a, 123);
});

test("VariableDeclaration-duplicate-let", t => {
  const scope = new Scope({});

  t.throws(function() {
    customEval(
      `
let a = 123;

let a = 321;

module.exports = a;
    `,
      scope
    );
  });
});

test("VariableDeclaration-duplicate-const", t => {
  const scope = new Scope({});

  t.throws(function() {
    customEval(
      `
const a = 123;

const a = 321;

module.exports = a;
    `,
      scope
    );
  });
});

test("VariableDeclaration-duplicate-with-context-let", t => {
  const scope = new Scope({
    global: "hello"
  });

  t.throws(function() {
    customEval(
      `
let global = "world"
module.exports = global;
      `,
      scope
    );
  });
});

test("VariableDeclaration-duplicate-with-context-const", t => {
  const scope = new Scope({
    global: "hello"
  });

  t.throws(function() {
    customEval(
      `
let global = "world"
module.exports = global;
      `,
      scope
    );
  });
});

test("VariableDeclaration-define let then cover", t => {
  const scope = new Scope({});

  const output = customEval(
    `
let name = "hello"
name = "world"  // cover the name, it should throw an error
module.exports = {name: name}
      `,
    scope
  );
  t.deepEqual(output.name, "world");
});

test("VariableDeclaration-define const then cover", t => {
  const scope = new Scope({});

  t.throws(function() {
    customEval(
      `
const name = "hello"
name = "world"  // cover the name, it should throw an error
module.exports = {name: name}
      `,
      scope
    );
  });
});

// FIXME: let and const should have block scope
// test("block scope", t => {
//   const scope = new Scope({});

//   const { a, b } = customEval(
//     `
// var a = 1;
// var b;
// {
//   // should have block scope
//   const a = 2;
//   b =a;
// }
// module.exports = {a:a, b:b}
//     `,
//     scope
//   );

//   t.deepEqual(a, 1);
//   t.deepEqual(b, 2);
// });
