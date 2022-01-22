const acorn = require("acorn");
const astring = require("astring");
const traverse = require("../../common/traverse");

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse(
    (
      /** @type { import('acorn').Node } */ node,
      /** @type {{ parentNode: import('acorn').Node }} */ ctx,
      next
    ) => {
      if (node.type === "Identifier") {
        // handle different case
        let shouldRename = true;
        switch (ctx?.parentNode?.type) {
          case "BreakStatement":
          case "LabeledStatement":
          case "Property":
            shouldRename = false;
            break;
          case "MemberExpression":
            shouldRename = ctx?.parentNode?.object === node;
            break;
          default:
            break;
        }

        if (shouldRename && node.name === originName) {
          // rename
          node.name = targetName;
        }
      }

      // store parentNode in ctx
      ctx = {
        ...ctx,
        parentNode: node,
      };

      // 继续往下遍历
      return next(node, ctx);
    }
  )(root);
}

function rename(code, originName, targetName) {
  const ast = acorn.parse(code, {
    ecmaVersion: 5,
  });
  return astring.generate(transform(ast, originName, targetName));
}

module.exports = rename;
