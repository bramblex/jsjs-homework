const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');
function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    switch (node.type) {
      // 函数名
      case 'FunctionDeclaration':
        if (node.id && node.id.name === originName)
          node.id.name = targetName
        break;
      // var 声明
      case 'VariableDeclaration':
        if (node.declarations[0].id.name === originName) {
          node.declarations[0].id.name = targetName;
        }
        break;
      // 对象属性
      case 'MemberExpression':
        if (node.object && node.object.name === originName) { node.object.name = targetName }
        break;
      // foo + foo
      case 'BinaryExpression':
        if (node.left && node.left.name === originName) { node.left.name = targetName }
        if (node.right && node.right.name === originName) { node.right.name = targetName }
        break;
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