const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("function have it's own scope even with var", t => {
  const scope = new Scope();

  const { get, getA } = customEval(
    `
var a = 1;

function get(){
  var a = 2; // function have it's own scope
  return a;
}

function getA(){
  return a;
}

module.exports = {get: get, getA: getA};
  `,
    scope
  );
  t.deepEqual(get(), 2);
  t.deepEqual(getA(), 1);
});

test("function have it's own scope even with let", t => {
  const scope = new Scope();

  const { get, getA } = customEval(
    `
var a = 1;

function get(){
  let a = 2; // function have it's own scope
  return a;
}

function getA(){
  return a;
}

module.exports = {get: get, getA: getA};
  `,
    scope
  );
  t.deepEqual(get(), 2);
  t.deepEqual(getA(), 1);
});

test("function have it's own scope even with const", t => {
  const scope = new Scope();

  const { get, getA } = customEval(
    `
var a = 1;

function get(){
  const a = 2; // function have it's own scope
  return a;
}

function getA(){
  return a;
}

module.exports = {get: get, getA: getA};
  `,
    scope
  );
  t.deepEqual(get(), 2);
  t.deepEqual(getA(), 1);
});

test("function scope can redeclare with var", t => {
  const scope = new Scope();

  const { get, getA } = customEval(
    `
var a = 1;

function get(){
  var a = 2;
  var a = 3;
  return a;
}

function getA(){
  return a;
}

module.exports = {get: get, getA: getA};
  `,
    scope
  );
  t.deepEqual(get(), 3);
  t.deepEqual(getA(), 1);
});

test("function scope can not redeclare with let", t => {
  const scope = new Scope();

  const { get } = customEval(
    `
var a = 1;

function get(){
  let a = 2;
  var a = 3;
  return a;
}

module.exports = {get: get};
  `,
    scope
  );
  t.throws(function() {
    get();
  });
});

test("function scope can not redeclare with const", t => {
  const scope = new Scope();

  const { get } = customEval(
    `
var a = 1;

function get(){
  const a = 2;
  var a = 3;
  return a;
}

module.exports = {get: get};
  `,
    scope
  );
  t.throws(function() {
    get();
  });
});
