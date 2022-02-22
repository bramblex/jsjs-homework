const test = require('ava');
const { customEval, Scope } = require('../eval');

test("set prototype with a hole object", t => {
  const scope = new Scope();

  const { man, Man } = customEval(
    `
function Man(){

}

Man.prototype = {
  say: function(){

  }
};

module.exports = {man: new Man(), Man: Man};
    `,
    scope
  );
  t.deepEqual(typeof Man, "function");
  t.deepEqual(typeof man.say, "function");
  t.true(man.say === man.__proto__.say);
});

test("Multiple prototype", t => {
  const scope = new Scope();

  const { man, Man, name } = customEval(
    `
function Man () {

}

Man.prototype.name = "axetroy"

Man.prototype.whoami = function () {
  return this.name
}

const man = new Man();

module.exports = { Man, man }
    `,
    scope
  );
  t.deepEqual(typeof Man, "function");
  t.deepEqual(man.name, "axetroy");
  t.deepEqual(Object.keys(man).length, 0);
});

test("prototype without return instance", t => {
  const scope = new Scope();

  const { test, Test } = customEval(
    `
var Test = function(text) {
  if (text) {
    var o = JSON.parse(text);
    this.id = o.id;
    this.list = o.list;
  } else {
    this.id = '';
    this.list = [];
  }
};

var test = new Test('{"id":1,"list":[1, 2, 3]}');

module.exports = { test, Test }
    `,
    scope
  );
  t.deepEqual(typeof Test, "function");
  t.deepEqual(test.id, 1);
  t.deepEqual(test.list, [1, 2, 3]);
  t.deepEqual(Object.keys(test).length, 2);
});
