const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {


    // TODO: 作业代码写在这里

    // if (node.type === 'FunctionDeclaration') {
    //   if(node.id.name === originName){
    //     node.id.name = targetName
    //   }
    // }
    // if (node.type === 'LabeledStatement') {
    //   if(node.label.name === originName){
    //     node.label.name = targetName
    //   }
    // }
    // if (node.type === 'VariableDeclaration') {
    //   for(i of node.declarations){
    //     i.id.name = targetName
    //   }
    // }
    // if (node.type === 'BreakStatement') {
    //   if(node.label.name === originName){
    //     node.label.name = targetName
    //   }
    // }
    if (node.type === 'Identifier') {
      if(node.name === originName){
        node.name = targetName
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
