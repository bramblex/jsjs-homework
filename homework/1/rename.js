const acorn = require("acorn");
const astring = require("astring");
const traverse = require("../../common/traverse");

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    switch (node.type) {
      // 修改方法名
      case "FunctionDeclaration":
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      //修改变量名
      case "VariableDeclarator":
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      //修改运算表达式时的变量
      case "BinaryExpression":
        if (node.left.type === "Identifier" && node.left.name === originName) {
          node.left.name = targetName;
        }
        if (node.right.type === "Identifier" && node.right.name === originName) {
          node.right.name = targetName;
        }
        break;
      //表达式中需要的修改
      case "MemberExpression":
        if (!node.object.object && node.object.name === originName) {
          node.object.name = targetName;
        }
        break;
      //其他可能情况，接着case下去
      //如修改赋值语句右侧可能的变量。
      case "AssignmentExpression":
        if (node.left.type === "Identifier" && node.left.name === originName) {
          node.left.name = targetName;
        }
        if (node.right.type === "Identifier" && node.right.name === originName) {
          node.right.name = targetName;
        }
        break;
      default:
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
