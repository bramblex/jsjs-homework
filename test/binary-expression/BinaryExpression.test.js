const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("+", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 1 + 2;
  `,
    scope
  );
  t.deepEqual(num, 3);
});

test("+=", t => {
  const scope = new Scope();

  const num = customEval(
    `
var a = 1;
var b = 2;
a += 2;
module.exports = a;
  `,
    scope
  );
  t.deepEqual(num, 3);
});

test("-", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 2 - 1;
  `,
    scope
  );
  t.deepEqual(num, 1);
});

test("-=", t => {
  const scope = new Scope();

  const num = customEval(
    `
var a = 1;
var b = 2;
a -= 2;
module.exports = a;
  `,
    scope
  );
  t.deepEqual(num, -1);
});

test("*", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 2 * 1;
  `,
    scope
  );
  t.deepEqual(num, 2);
});

test("*=", t => {
  const scope = new Scope();

  const num = customEval(
    `
var a = 1;
var b = 2;
a *= 2;
module.exports = a;
  `,
    scope
  );
  t.deepEqual(num, 2);
});

test("/", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 2 / 1;
  `,
    scope
  );
  t.deepEqual(num, 2);
});

test("/=", t => {
  const scope = new Scope();

  const num = customEval(
    `
var a = 1;
var b = 2;
a /= 2;
module.exports = a;
  `,
    scope
  );
  t.deepEqual(num, 0.5);
});

test("%", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 2 % 1;
  `,
    scope
  );
  t.deepEqual(num, 0);
});

test("%=", t => {
  const scope = new Scope();

  const num = customEval(
    `
var a = 1;
var b = 2;
a %= 2;
module.exports = a;
  `,
    scope
  );
  t.deepEqual(num, 1);
});

test("**", t => {
  const scope = new Scope();

  const num = customEval(
    `
module.exports = 2 ** 2;
  `,
    scope
  );
  t.deepEqual(num, 4);
});

test(">", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 > 2;
  `,
    scope
  );
  t.deepEqual(output, false);
});

test(">=", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 >= 2;
  `,
    scope
  );
  t.deepEqual(output, true);
});

test("<", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 < 2;
  `,
    scope
  );
  t.deepEqual(output, false);
});

test("<=", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 <= 2;
  `,
    scope
  );
  t.deepEqual(output, true);
});

test(">>", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 >> 2;
  `,
    scope
  );
  t.deepEqual(output, 0);
});

test(">>>", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 >>> 2;
  `,
    scope
  );
  t.deepEqual(output, 0);
});

test("<<", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 << 2;
  `,
    scope
  );
  t.deepEqual(output, 8);
});

test("&", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 & 2;
  `,
    scope
  );
  t.deepEqual(output, 2);
});

test("|", t => {
  const scope = new Scope();

  const output = customEval(
    `
module.exports = 2 | 2;
  `,
    scope
  );
  t.deepEqual(output, 2);
});
