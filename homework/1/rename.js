const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    console.log(node);
    // TODO: 作业代码写在这里
    // 重命名函数名 和 局部变量名
    if (node.type === "FunctionDeclaration" || node.type === "VariableDeclarator") {
      if(node.id.name == originName) {
        node.id.name = targetName
      }
    }
    // 重命名表达式两个操作数
    if(node.type === "BinaryExpression" && node.operator === "+") {
      if(node.left.name == originName) {
        node.left.name = targetName;
      }
      if(node.right.name == originName){
        node.right.name = targetName;
      }
    }
    // 重命名对象值
    if(node.type === "MemberExpression" && node.computed) {
      if(node.object.object.object.name == originName) {
        node.object.object.object.name = targetName;
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