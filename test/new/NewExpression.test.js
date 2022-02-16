const test = require('ava');
const { customEval, Scope } = require('../../eval');

test("NewExpression", t => {
  const scope = new Scope();

  const { people, People } = customEval(
    `
function People(name, age){
  this.name = name;
}

module.exports = {
  people: new People("axetroy", 12),
  People: People
};
  `,
    scope
  );

  // constructor
  t.deepEqual(People.length, 2);
  t.deepEqual(People.name, "People");

  // entity
  t.true(people instanceof People);
  t.deepEqual(people.name, "axetroy");
  t.true(people.constructor === People);
});

test("NewExpression for built-in functions", t => {
  const scope = new Scope({
    Array,
    Date,
    RegExp
  });

  const { array, date, regexp } = customEval(
    `
    var array = new Array(1, 2, 3);
    var date = new Date();
    var regexp = new RegExp('abc');

    module.exports = {
      array: array,
      date: date,
      regexp: regexp
    }
  `,
    scope
  );

  t.deepEqual(array.length, 3);
  t.true(date <= new Date());
  t.true(regexp instanceof RegExp);
});

test("NewExpression for constructor function which return object", t => {
  const scope = new Scope();

  const { o, p } = customEval(
    `
    var o = {
      a: 1
    }

    function P() {
      this.name = 1

      return o
    }

    var p = new P()

    module.exports = {
      o: o,
      p: p
    }
    `,
    scope
  );

  t.deepEqual(o, p);
});
