const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // TODO: 作业代码写在这里
    const directRenameList = ['FunctionDeclaration', 'VariableDeclarator', 'BinaryExpression'];
    let shouldRename = false;
    if (node.type === 'Identifier' && node.name === originName && (directRenameList.includes(ctx?.type) || (ctx?.type === 'MemberExpression' && ctx?.object === node))) {
      shouldRename = true;
    }

    if(shouldRename){
      node.name = targetName;
    }
    
    ctx = node;

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