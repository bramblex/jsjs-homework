const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    if (node.type === 'FunctionDeclaration') {
      // 节点类型是函数声明

      // 符合条件则改变该函数声明的函数名
      if (node.id.name === originName) {
        node.id.name = targetName;
      }

    } else if (node.type === 'VariableDeclarator') {
      // 节点类型是变量说明符

      if (node.id.name === originName) {
        node.id.name = targetName;
      }

    } else if (node.type === 'MemberExpression') {
      // 节点类型是成员表达式 foo.foo 中的 foo
      
      if (node.object.name === originName) {
        node.object.name = targetName;
      }

    } else if (node.type === 'BinaryExpression') {
      // 节点类型是二元表达式

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