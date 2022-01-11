const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
    // 遍历所有节点
    return traverse((node, ctx, next) => {

        // TODO: 作业代码写在这里
        const nodeTypeArray = [
            'FunctionDeclaration',
            'VariableDeclarator',
            'MemberExpression',
            'BinaryExpression'
        ]
        const keyTypeArray = [
            'property',
            'label',
            'key'
        ]
        if (nodeTypeArray.includes(node.type)) {
            for (const key in node) {
                if (keyTypeArray.includes(key)) continue
                if (node[key].type === 'Identifier' && node[key].name === originName) {
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