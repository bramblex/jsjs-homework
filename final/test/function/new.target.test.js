const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("new target without new", t => {
  const scope = new Scope();

  const Person = customEval(
    `
function Person(name){
  return new.target;
}

module.exports = Person;
  `,
    scope
  );

  t.deepEqual(Person(), undefined);
});

test("new target with new", t => {
  const scope = new Scope();

  const { Person, target } = customEval(
    `
var target;

function Person(name){
  target = new.target;
}

new Person();

module.exports = {target: target, Person: Person};
  `,
    scope
  );

  t.true(target === Person);
});
