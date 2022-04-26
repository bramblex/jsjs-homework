const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("TryStatement", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  runTry: false,
  runError: false
};

try {
  obj.runTry = true;
} catch (err) {
  obj.runError = true;
}

module.exports = obj;
  `,
    scope
  );

  t.true(obj.runTry);
  t.false(obj.runError);
});

test("TryStatement-with-throw", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  runTry: false,
  runError: false
};

try {
  obj.runTry = true;
  throw new Error("invalid ...");
} catch (err) {
  obj.runError = true;
}

module.exports = obj;
  `,
    scope
  );

  t.true(obj.runTry);
  t.true(obj.runError);
});

test("TryStatement with finally", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  runTry: false,
  runError: false,
  runFinally: false
};

try {
  obj.runTry = true;
} catch (err) {
  obj.runError = true;
}finally{
  obj.runFinally = true;
}

module.exports = obj;
  `,
    scope
  );

  t.true(obj.runTry);
  t.false(obj.runError);
  t.true(obj.runFinally);
});

test("continue in try block nest loop", t => {
  const scope = new Scope();

  const arr = customEval(
    `
const result = [];
let i = 0;

while(i<5){
  i++;
  try {
    if (i %2 === 0){
      continue; // continue the loop
    }
  } catch (err) {
    //
  }
  result.push(i);
}

module.exports = result;
  `,
    scope
  );
  t.deepEqual(arr, [1, 3, 5]);
});

test("continue in catch block nest loop", t => {
  const scope = new Scope();

  const arr = customEval(
    `
const result = [];
let i = 0;

while(i<5){
  i++;
  try {
    if (i %2 === 0){
      throw new Error();
    }
  } catch (err) {
    //
    continue
  }
  result.push(i);
}

module.exports = result;
  `,
    scope
  );
  t.deepEqual(arr, [1, 3, 5]);
});

test("continue in finally block nest loop", t => {
  const scope = new Scope();

  const arr = customEval(
    `
const result = [];
let i = 0;

while(i<5){
  i++;
  try {
    //
  } catch (err) {
    //
  }finally{
    if (i %2 === 0){
      continue;
    }
  }
  result.push(i);
}

module.exports = result;
  `,
    scope
  );
  t.deepEqual(arr, [1, 3, 5]);
});
