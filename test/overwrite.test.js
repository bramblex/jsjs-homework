const test = require('ava');
const { customEval, Scope } = require('../eval');

test("overwrite native toString method", t => {
  const scope = new Scope();

  const { d, Demo } = customEval(
    `
var Demo = function(text) {};

Demo.prototype = {
  toString: function() {
    return JSON.stringify(this);
  }
};

var d = new Demo();

module.exports = {d: d, Demo: Demo};
    `,
    scope
  );
  t.deepEqual(typeof d.toString, "function");
  t.deepEqual(typeof Demo, "function");
  t.true(d.toString === Demo.prototype.toString);
  t.true(d.__proto__ === Demo.prototype);
});

test("overwrite native valueOf method", t => {
  const scope = new Scope();

  const { d, Demo } = customEval(
    `
var Demo = function(text) {};

Demo.prototype = {
  valueOf: function() {
    return 1;
  }
};

var d = new Demo();

module.exports = {d: d, Demo: Demo};
    `,
    scope
  );
  t.deepEqual(typeof d.toString, "function");
  t.deepEqual(typeof Demo, "function");
  t.true(d.toString === Demo.prototype.toString);
  t.true(d.__proto__ === Demo.prototype);
  t.deepEqual(d + 0, 1);
});
