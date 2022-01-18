const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    // console.log(node)
    switch (node.type) {
      case "VariableDeclarator":
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      case "FunctionDeclaration":
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      case "MemberExpression":
        // console.log(node)
        if (node.object != null && node.object.name === originName) {
          node.object.name = targetName;
        }
        break;

      case "BinaryExpression":
        if (node.left != null && node.left.name === originName) {
          node.left.name = targetName;
        }
        if (node.right != null && node.right.name === originName) {
          node.right.name = targetName;
        }
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