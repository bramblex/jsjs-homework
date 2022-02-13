const test = require('ava');
const { Scope, customEval } = require('../../eval');

test("new target with new", t => {
  const scope = new Scope({});

  const { Person, target } = customEval(
    `
var target;

function Person(name){
  return (() => {
    target = new.target;
    return target;
  })();
}

new Person();

module.exports = {target: target, Person: Person};
  `,
    scope
  );

  t.true(target === Person);
});
