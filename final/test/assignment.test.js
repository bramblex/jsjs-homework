const test = require('ava')
const { customEval, Scope } = require('../eval')

test('Assignment should calculate the right expression first', t => {
  const scope = new Scope()

  t.throws(function () {
    customEval(
      `
        const a = 123;
        a = b
      `,
      scope,
    )
  })
})
