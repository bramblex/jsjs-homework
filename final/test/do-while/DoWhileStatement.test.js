const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("basic", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0
};
do {
  obj.i++;
} while (obj.i < 3);

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.i === "number");
  t.deepEqual(obj.i, 3);
});

test("break in do block", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0
};
do {
  obj.i++;
  break;
} while (obj.i < 3);

module.exports = obj;
  `,
    scope
  );
  t.deepEqual(obj.i, 1);
});

test("do-while in function with return, it should cross block scope", t => {
  const scope = new Scope();

  const get = customEval(
    `
function get() {
  const obj = {
    i: 0
  };
  do {
    obj.i++;
    return obj;
  } while (obj.i < 3);
}

module.exports =  get;
  `,
    scope
  );
  t.deepEqual(get(), { i: 1 });
});
