const acorn = require('acorn');
const traverse = require('../../common/traverse')
const rename = require('./rename')

// TODO: 无视代码格式标准化
function toStandard(code) {
  const root = acorn.parse(code, { ecmaVersion: 5 })

  const target = traverse((node, ctx, next) => {
    delete node.start
    delete node.end
    return next(node)
  })(root)

  return target
}

test('测试重命名变量', () => {
  const sourceCode = `
function foo() {
	foo: while(true) {
		var foo = {
			foo: foo.foo.foo[foo + foo]
		};
		break foo;
	}
}
`

  const targetCode = `
function bar() {
	foo: while(true) {
		var bar = {
			foo: bar.foo.foo[bar + bar]
		};
		break foo;
	}
}
`;

  const result = rename(sourceCode, 'foo', 'bar');

  expect(toStandard(result)).toStrictEqual(toStandard(targetCode));
})