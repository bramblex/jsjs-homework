const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    if (node.type === 'FunctionDeclaration' && node.id.name === originName) {
      node.id.name = targetName
    }
    if (node.type === 'VariableDeclarator' && node.id.name === originName) {
      node.id.name = targetName
    }
    if (node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === originName) {
      node.object.name = targetName
    }
    if (node.type === 'BinaryExpression') {
      if (node.left.name === originName) {
        node.left.name = targetName
      }
      if (node.right.name === originName) {
        node.right.name = targetName
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