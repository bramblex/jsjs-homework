const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

/** 
 * 思路：观察抽象语法树，哪些标签是变量名，哪些不是
 * 将那些是变量名的标签的值重新赋予即可。
 * 当然，完备的重命名需要看estree的文档，这里偷懒并没有实现
 */
function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {

    // 作业代码写在这里
    const renameLabels = {
      'FunctionDeclaration': ['id'],
      'VariableDeclarator': ['id'],
      'MemberExpression': ['object'],
      'BinaryExpression': ['left', 'right']
    };
    // FunctionDeclaration的id字段是变量名
    // MemberExpression的object字段是变量名，以此类推
    // 注意，MemberExpression的property字段不是变量名
    if (node.type in renameLabels) {
      for (const key of renameLabels[node.type]) {
        if (node[key] && node[key].type === 'Identifier' && node[key].name === originName) {
          node[key].name = targetName;
        }
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