const test = require('ava');
const { Scope, customEval }  = require('../../eval')

test("Var should Hoisting", async t => {
  const scope = new Scope();

  const say = customEval(
    `
module.exports = function(word) {
  const result = prefix + "hello " + word;
  var prefix = 123;
  return result;
};
  `,
    scope
  );
  t.deepEqual(say("world"), "undefinedhello world");
});

test("Let should not Hoisting", async t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
console.log(a);
let a = 123;
    `,
      scope
    );
  });
});

test("Const should not Hoisting", async t => {
  const scope = new Scope();

  t.throws(function() {
    customEval(
      `
console.log(a);
const a = 123;
    `,
      scope
    );
  });
});

test("Function should not Hoisting", async t => {
  const scope = new Scope();

  const say = customEval(
    `
module.exports = function(word) {
  const result = say(word);
  function say(w) {
    return "hello " + w;
  }
  return result;
};
  `,
    scope
  );
  t.deepEqual(say("world"), "hello world");
});

test("For Hoisting", async t => {
  const scope = new Scope();

  const func = customEval(
    `
function get() {
  for (let i = 0; i < 1; i++) {
    i++;
    let result = a;
    if (result === undefined) {
      return true;
    }
    var a = 123;
  }
}
module.exports = get;
  `,
    scope
  );
  t.true(func());
});

test("If Hoisting", async t => {
  const scope = new Scope();

  const func = customEval(
    `
function get() {
  if (a === undefined) {
    return true;
  }
  var a = 123;
}

module.exports = get;
  `,
    scope
  );
  t.true(func());
});

test("While Hoisting", async t => {
  const scope = new Scope();

  const func = customEval(
    `
function get() {
  while (a === undefined) {
    return true;
  }
  var a = 123;
}

module.exports = get;
  `,
    scope
  );
  t.true(func());
});

test("Switch Hoisting", async t => {
  const scope = new Scope();

  const func = customEval(
    `
function get() {
  switch(a){
    case undefined:
      return true;
    default:
      return false;
  }
  var a = 123;
}

module.exports = get;
  `,
    scope
  );
  t.true(func());
});
