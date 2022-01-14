const acorn = require('acorn');
const traverse = require('../../common/traverse')
const rename = require('./rename')

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
const ast = acorn.parse(sourceCode, {
  ecmaVersion: 5,
})
// console.log(ast)


const result = rename(sourceCode, 'foo', 'bar');

console.log(result)
