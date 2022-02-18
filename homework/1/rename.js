const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

		// TODO: 作业代码写在这里

		// 对方法名进行重命名
		if (node.type === 'FunctionDeclaration') {
			if (node.id.name === originName) {
				node.id.name = targetName;
			}
		}
		// 对变量名进行重命名
		if (node.type === 'VariableDeclaration') {
			if (node.declarations[0].id.name === originName) {
				node.declarations[0].id.name = targetName;
			}
		}
		// 对象属性名进行重命名
		if (node.type === 'MemberExpression' && !node.object.object) {
			if (node.object.name === originName) {
				node.object.name = targetName;
			}
		}
		// 对 [foo + foo] 进行重命名
		if (node.type === 'BinaryExpression') {
			if (node.left.name === originName) {
				node.left.name = targetName;
			}
			if (node.right.name === originName) {
				node.right.name = targetName;
			}
		}

    // 继续往下遍历
    return next(node, ctx)
  })(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  })
  return astring.generate(transform(ast, originName, targetName))
}

module.exports = rename