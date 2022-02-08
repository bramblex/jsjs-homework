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

    if (node.type === Identifier) {
      let rename = false;
      console.log(ctx)
      switch (ctx.type) {
        case MemberExpression:
          if (ctx.object === node) {
            rename = true;
          }
          break;
        case BinaryExpression:
        case FunctionDeclaration:
        case VariableDeclarator:
          rename = true;
          break;
      }

      if (rename && node.name === originName) {
        node.name = targetName;
      }
    }
    ctx = node
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