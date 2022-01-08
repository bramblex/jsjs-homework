const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
    // 遍历所有节点
    return traverse((node, ctx, next) => {

        // TODO: 作业代码写在这里
        if (node.type === 'FunctionDeclaration' && node.id.name === originName) {
            node.id.name = targetName
        } else if (node.type === 'VariableDeclarator' && node.id.name === originName) {
            node.id.name = targetName;
        } else if (node.type === 'MemberExpression' && node.object.name === originName) {
            node.object.name = targetName;
        } else if (node.type === 'BinaryExpression') {
            traverse((node, ctx, next) => {
                if (node.type === 'Identifier' && node.name === originName) {
                    node.name = targetName;
                }
                return next(node, ctx)
            })(node)
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