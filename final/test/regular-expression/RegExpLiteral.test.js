const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("basic without flags", t => {
  const scope = new Scope();

  const func = customEval(
    `
const reg = /^hello/;

function isSayHi(word) {
  return reg.test(word);
}

module.exports = isSayHi;
  `,
    scope
  );

  t.true(func("hello world"));
  t.false(func("abcd"));
});

test("with flags", t => {
  const scope = new Scope();

  const func = customEval(
    `
const reg = /^hello/i;

function isSayHi(word) {
  return reg.test(word);
}

module.exports = isSayHi;
  `,
    scope
  );

  t.true(func("hello world"));
  t.true(func("Hello woRld"));
});

test("with multiple flags", t => {
  const scope = new Scope();

  const func = customEval(
    `
const reg = /^hello/im;

function isSayHi(word) {
  return reg.test(word);
}

module.exports = isSayHi;
  `,
    scope
  );

  t.true(func("hello world"));
  t.true(func("Hello woRld"));
  t.true(func("Hello \nwoRld"));
});
