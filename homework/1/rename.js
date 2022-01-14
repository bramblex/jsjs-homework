const acorn = require("acorn");
const astring = require("astring");
const traverse = require("../../common/traverse");

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // node can't belong to "label|key|property[computed=false]"
    if (node.type === "Identifier") {
      let label = ctx.label && ctx.label === node;
      let key = ctx.key && ctx.key === node;
      let property = ctx.property && !ctx.computed && ctx.property === node;

      if (label || key || property) {
        return next(node, node);
      } else if (node.name === originName) {
        node.name = targetName;
      }
    }

    // 继续往下遍历, 传入ctx为当前node
    return next(node, node);
  })(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  });
  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename;
