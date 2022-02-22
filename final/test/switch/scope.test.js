const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("var in switch block should cover the parent scope", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = "a";

switch (a) {
  case "a":
    var a = "b";
    break;
  case "b":
    break;
  default:
    break;
}

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, "b");
});

test("let in switch block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = "a";
var b;

switch (a) {
  case "a":
    let a = "b";
    b = a;
    break;
  case "b":
    break;
  default:
    break;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, "a");
  t.deepEqual(obj.b, "b");
});

test("const in switch block should define in it's scope", t => {
  const scope = new Scope();

  const obj = customEval(
    `
var a = "a";
var b;

switch (a) {
  case "a":
    const a = "b";
    b = a;
    break;
  case "b":
    break;
  default:
    break;
}

module.exports = {a: a, b: b};
  `,
    scope
  );
  t.deepEqual(obj.a, "a");
  t.deepEqual(obj.b, "b");
});

test("var in switch block and parent scope let some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
let a = "a";

switch (a) {
  case "a":
    var a = "b";
    break;
  case "b":
    break;
  default:
    break;
}
    `,
      scope
    );
  });
});

test("var in switch block and parent scope const some name var", t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
const a = "a";

switch (a) {
  case "a":
    var a = "b";
    break;
  case "b":
    break;
  default:
    break;
}
    `,
      scope
    );
  });
});

test("switch scope should share scope in each case", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const a = "a";
var b;
const obj = {};

switch (true) {
case true:
  let a = "b";
  obj.a = a;
case true:
  obj.b = a;
default:
  obj.default = a;
}

module.exports = obj;
  `,
    scope
  );

  t.deepEqual(obj.a, "b");
  t.deepEqual(obj.b, "b");
  t.deepEqual(obj.default, "b");
});
