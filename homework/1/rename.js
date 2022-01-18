const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
  // 遍历所有节点
  return traverse((node, ctx, next) => {
    switch(node.type) {
      case 'VariableDeclaration':
        let variableDeclarator = node.type.declarations[0];
        if (variableDeclarator.name === originName) {
          variableDeclarator.name = targetName;
        }
        break;
      case 'FunctionDeclaration':
        if (node.id.name === originName) {
          node.id.name = targetName;
        }
        break;
      // case 'ObjectExpression':
      //   if (node.properties[0].key.name === originName) {
      //     node.properties[0].key.name = targetName;
      //   }
      //   break;
      case 'BinaryExpression':
        if (node.left.name === originName) {
          node.left.name = targetName;
        }
        else if (node.right.name === originName) {
          node.right.name = targetName;
        }
        break;
      case 'MemberExpression' && !node.object.object:
        if (node.object.name === originName) {
          node.object.name === targetName;
        }
        break;
    }
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