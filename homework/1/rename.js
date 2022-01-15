const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    // TODO: 作业代码写在这里
    /*
    * 真的尝试了不想一个个匹配
    * 但是没找到解决方法
    * 于是就这样了ε=(´ο｀*)))唉
    * */
    if (node.type === 'FunctionDeclaration') {
      if(node.id.name === originName){
        node.id.name = targetName
      }
    }
    if (node.type === 'VariableDeclaration') {
      for(i of node.declarations){
        i.id.name = targetName
      }
    }
    if (node.type === 'MemberExpression') {
      if(node.object.name === originName){
        node.object.name = targetName
      }
    }
    if (node.type === 'BinaryExpression') {
      node.left.name = targetName;
      node.right.name = targetName;
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
