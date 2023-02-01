const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');



function transform(root, originName, targetName) {

  // 替换变量名
  function replace(name){
    if (name === originName) return targetName
  }

  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    if (node.type === 'VariableDeclarator') {
      node.id.name = replace(node.id.name)
    }
    if (node.type === 'MemberExpression') {
      if (node.object.type === 'Identifier') {
        node.object.name = replace(node.object.name)
      }
    }
    if (node.type === 'BinaryExpression') {
      if (node.left.type === 'Identifier') {
        node.left.name = replace(node.left.name)
      }
      if (node.right.type === 'Identifier') {
        node.right.name = replace(node.right.name)
      }
    }
    if (node.type === 'FunctionDeclaration') {
      if (node.id.type === 'Identifier') {
        node.id.name = replace(node.id.name)
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