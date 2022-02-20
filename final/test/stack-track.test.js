const test = require('ava')
const { customEval, Scope } = require('../eval')

test('not defined', t => {
  const scope = new Scope()
  t.throws(function () {
    customEval(
      `function get(){
var a = 123;
console.log(b);
}

get();`,
      scope,
    )
  })
})
