const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

const FunctionDeclaration = "FunctionDeclaration";
const VariableDeclarator = "VariableDeclarator";
const MemberExpression = "MemberExpression";
const Identifier = "Identifier";
const BinaryExpression = "BinaryExpression";

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    switch (node.type) {
      // function bar()
      case FunctionDeclaration:
      // var bar
      case VariableDeclarator:
        console.log(node.type)
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      // { foo: bar }
      case MemberExpression:
        if (node.object.type === Identifier && node.object.name === originName) {
          node.object.name = targetName;
        }
        break;
      // bar + bar
      case BinaryExpression:
        if (node.left.name === originName) {
          node.left.name = targetName;
        }
        if (node.right.name === originName) {
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