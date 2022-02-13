const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("ForStatement-1", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {num: 0};
for (let i = 0; i < 3; i++) {
  obj.num++;
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.num === "number");
  t.deepEqual(obj.num, 3);
});

test("ForStatement-2", t => {
  const scope = new Scope();

  const obj = customEval(
    `
const obj = {num: 0};
for (;;) {
  obj.num++;
  if (obj.num >= 3) {
    break;
  }
}

module.exports = obj;
  `,
    scope
  );

  t.true(typeof obj.num === "number");
  t.deepEqual(obj.num, 3);
});
