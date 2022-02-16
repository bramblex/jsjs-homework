const test = require('ava');

const { Scope, customEval } = require('../../eval');

function sleep(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

test("async with resolve", async t => {
  const scope = new Scope({});

  const get = customEval(
    `
async function get(name){
  return 123;
}

module.exports = get;
  `,
    scope
  );

  const promise = get("name");

  t.true(promise instanceof Promise);

  const result = await promise;

  t.deepEqual(result, 123);
});

test("async with reject", async t => {
  const scope = new Scope({});

  const get = customEval(
    `
async function get(name){
  return Promise.reject("error");
}

module.exports = get;
  `,
    scope
  );

  const promise = get("name");

  t.true(promise instanceof Promise);

  try {
    await promise;
  } catch (err) {
    t.deepEqual(err, "error");
  }
});

test("async with async action", async t => {
  const scope = new Scope({ sleep });

  const get = customEval(
    `
async function get(name){
  await sleep(20);
  return Promise.resolve("data");
}

module.exports = get;
  `,
    scope
  );

  const promise = get("name");

  t.true(promise instanceof Promise);

  const result = await promise;

  t.deepEqual(result, "data");
});
