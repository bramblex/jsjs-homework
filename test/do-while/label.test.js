const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("break with label", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

doLoop:
do {
  a++;
  break doLoop;
} while (true);

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 2);
});

test("continue with label", t => {
  const scope = new Scope();

  const a = customEval(
    `
var a = 1;

doLoop:
do {
  a++;
  continue doLoop;
} while (a<10);

module.exports = a;
  `,
    scope
  );
  t.deepEqual(a, 10);
});
