//@ts-check
const acorn = require("acorn");
const astring = require("astring");
const traverse = require("../../common/traverse");

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    for (const k in node) {
      if (
        node[k] instanceof Object &&
        !["label", "key", "property"].includes(k) &&
        node[k].type === "Identifier" &&
        node[k].name === originName
      ) {
        node[k].name = targetName;
      }
    }

    // 继续往下遍历
    return next(node, ctx);
  })(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  });
  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename;
