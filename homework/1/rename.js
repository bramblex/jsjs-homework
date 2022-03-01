const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
      if (node.id) {
        if (node.id.type === 'Identifier' && node.id.name === originName) {
          node.id.name = targetName
        }
      }
      if (node.params.length > 0) {
        for(child in node.params) {
          if (child.type === 'Identifier' && child.name === originName) {
            child.name = targetName
          }
        }
      }
    }
    if (node.type === 'VariableDeclarator') {
      if (node.id.type === 'Identifier' && node.id.name === originName) {
        node.id.name = targetName
      }
    }
    if (node.type === 'ArrayExpression') {
      if (node.elements.length > 0) {
        for(child in node.elements) {
          if (child.type === 'Identifier' && child.name === originName) {
            child.name = targetName
          }
        }
      }
    }
    if (node.type === 'ObjectExpression') {
      if (node.properties.length > 0) {
        node.properties.forEach(child => {
          if (child.value.type === 'Identifier' && child.name === originName) {
            child.name = targetName
          }
        })
      }
    }
    if (node.type === 'UnaryExpression' || node.type === 'UpdateExpression') {
      if (node.argument) {
        if (node.argument.type === 'Identifier' && node.argument.name === originName) {
          node.argument.name = targetName
        }
      }
    }
    if (node.type === 'BinaryExpression' || node.type === 'AssignmentExpression' || node.type === 'LogicalExpression') {
      if (node.left.type === 'Identifier' && node.left.name === originName) {
        node.left.name = targetName
      }
      if (node.right.type === 'Identifier' && node.right.name === originName) {
        node.right.name = targetName
      }
    }
    if (node.type === 'MemberExpression') {
        if (node.object.type === 'Identifier' && node.object.name === originName) {
          node.object.name = targetName
        }
      }
    if (node.type === 'ConditionalExpression') {
      if (node.test.type === 'Identifier' && node.test.name === originName) {
        node.test.name = targetName
      }
      if (node.alternate.type === 'Identifier' && node.alternate.name === originName) {
        node.alternate.name = targetName
      }
      if (node.consequent.type === 'Identifier' && node.consequent.name === originName) {
        node.consequent.name = targetName
      }
    }
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      if (node.callee.type === 'Identifier' && node.callee.name === originName) {
        node.callee.name = targetName
      }
      if (node.arguments.length > 0) {
        for (child in node.arguments) {
          if (child.type === 'Identifier' && child.name === originName) {
            child.name = targetName
          }
        }
      }
    }
    if (node.type === 'SequenceExpression') {
      if (node.expressions.length > 0) {
        for (child in node.expressions) {
          if (child.type === 'Identifier' && child.name === originName) {
            child.name = targetName
          }
        }
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

// const sourceCode = `
// function foo() {
// 	foo: while(true) {
// 		var foo = {
// 			foo: foo.foo.foo[foo + foo]
// 		};
// 		break foo;
// 	}
// }
// `
// const result = rename(sourceCode, 'foo', 'bar');
// console.log(result)
module.exports = rename
