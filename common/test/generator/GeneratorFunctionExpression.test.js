const test = require('ava');
const { Scope, customEval } = require('../../eval');

test("GeneratoeFunction-1", t => {
  const scope = new Scope({
    name: "world"
  });

  const get = customEval(
    `
function* get(){
  var a = 123;
  yield a;
}

module.exports = get;
  `,
    scope
  );

  const generator = get();
  t.deepEqual(generator.next(), { done: false, value: 123 });
  t.deepEqual(generator.next(), { done: true, value: undefined });
});

test("GeneratoeFunction-2", t => {
  const scope = new Scope({
    name: "world"
  });

  const get = customEval(
    `
function* get(){
  var a = 123;
  yield a;
  var b = "hello world";
  yield b;
}

module.exports = get;
  `,
    scope
  );

  const generator = get();
  t.deepEqual(generator.next(), { done: false, value: 123 });
  t.deepEqual(generator.next(), { done: false, value: "hello world" });
  t.deepEqual(generator.next(), { done: true, value: undefined });
});

test("GeneratoeFunction-3", t => {
  const scope = new Scope({
    name: "world"
  });

  const get = customEval(
    `
function* get(){
  var a = 123;
  yield a;
  var b = "hello world";
  yield b;
  return 233;
}

module.exports = get;
  `,
    scope
  );

  const generator = get();
  t.deepEqual(generator.next(), { done: false, value: 123 });
  t.deepEqual(generator.next(), { done: false, value: "hello world" });
  t.deepEqual(generator.next(), { done: true, value: 233 });
});

test("GeneratoeFunction-4", t => {
  const scope = new Scope({
    name: "world"
  });

  const get = customEval(
    `
function* get(){
  var a = 123;
  yield a;
  var b = "hello world";
  var c = yield b;
  return c;
}

module.exports = get;
  `,
    scope
  );

  const generator = get();
  t.deepEqual(generator.next(), { done: false, value: 123 });
  t.deepEqual(generator.next(), { done: false, value: "hello world" });
  t.deepEqual(generator.next(), { done: true, value: undefined });
});

test("GeneratoeFunction-5", t => {
  const scope = new Scope({
    name: "world"
  });

  const get = customEval(
    `
function* get(){
  var a = 123;
  yield a;
  var b = "hello world";
  var c = "@" + (yield b);
  return c;
}

module.exports = get;
  `,
    scope
  );

  const generator = get();
  t.deepEqual(generator.next(), { done: false, value: 123 });
  t.deepEqual(generator.next(), { done: false, value: "hello world" });
  t.deepEqual(generator.next(), { done: true, value: "@undefined" });
});
