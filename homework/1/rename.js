const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

  // TODO: 作业代码写在这里

  // sol1:
  // const renameType = {
  //   "FunctionDeclaration": ["id"],
  //   "VariableDeclarator": ["id"],
  //   "MemberExpression": ["object"],
  //   "BinaryExpression": ["left", "right"],
  // }
  // if (node.type in renameType) {
  //   for (const key of renameType[node.type]) {
  //     if (node[key] && node[key].type === "Identifier" && node[key].name === originName) {
  //       node[key].name = targetName;
  //     }
  //   }
  // }
  
  // sol2:
  const renameKeys = ["id", "argument", "test", "discriminant", "param", "init", "update", "left", "right", "expression", "object", "alternate", "consequent", "callee"];
  for (const key of renameKeys) {
    if (node[key] && node[key].type === "Identifier" && node[key].name === originName) {
      node[key].name = targetName;
    }
  }
  const renameArrays = ["arguments", "expressions"];
  for (const key of renameArrays) {
    if (node[key] && Array.isArray(node[key])) {
      const renameObjs = node[key].filter(item => item.type && item.type === "Identifier" && item.name === originName);
      renameObjs.forEach(obj => {
        obj.name = targetName;
      });
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