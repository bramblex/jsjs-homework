const acorn = require('acorn')
const astring = require('astring')
const traverse = require('../../common/traverse')

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    let IdentifierNodes = []
    const isIdentifierNode = (node) => Object.keys(node).includes('name')
    if (['FunctionDeclaration', 'VariableDeclarator'].includes(node.type)) {
      isIdentifierNode(node.id) && IdentifierNodes.push(node.id)
    } else if (node.type === 'BinaryExpression') {
      isIdentifierNode(node.left) && IdentifierNodes.push(node.left)
      isIdentifierNode(node.right) && IdentifierNodes.push(node.right)
    } else if (node.type === 'MemberExpression') {
      isIdentifierNode(node.object) && IdentifierNodes.push(node.object)
    }

    IdentifierNodes.forEach(
      (item) => item.name === originName && (item.name = targetName)
    )

    // 继续往下遍历
    return next(node, ctx)
  })(root)
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  })
  return astring.generate(transform(ast, originName, targetName))
}

module.exports = rename
