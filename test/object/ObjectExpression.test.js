const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("basic", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0
};

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.i === "number");
  t.deepEqual(obj.i, 0);
});

test("object with method", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0,
  get(){
    return this.i;
  }
};

module.exports = obj;
  `,
    scope
  );
  t.deepEqual(obj.i, 0);
  t.deepEqual(obj.get(), obj.i);
});

test("object with getter method", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0,
  get value(){
    return this.i;
  }
};

module.exports = obj;
  `,
    scope
  );
  t.deepEqual(obj.i, 0);
  t.deepEqual(obj.value, obj.i);
});

test("object with setter method", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0,
  set value(val){
    this.i = val;
  }
};

module.exports = obj;
  `,
    scope
  );
  t.deepEqual(obj.i, 0);
  obj.value = 123;
  t.deepEqual(obj.i, 123);
});
