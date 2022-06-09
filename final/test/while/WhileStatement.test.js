const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("WhileStatement-1", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0
};

while (obj.i < 3) {
  obj.i++;
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.i === "number");
  t.deepEqual(obj.i, 3);
});

test("WhileStatement-2", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {
  i: 0
};

while (true) {
  obj.i++;
  if (obj.i >= 3) {
    break;
  }
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.i === "number");
  t.deepEqual(obj.i, 3);
});
