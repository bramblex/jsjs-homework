const acorn = require('acorn');
const astring = require('astring');
const traverse = require('../../common/traverse');

function transform(root, originName, targetName) {
    // 遍历所有节点
    return traverse((node, ctx, next) => {

        // TODO: 作业代码写在这里
        const isNode = target =>
            target && typeof target.type === 'string';

        const isNodeArray = target =>
            Array.isArray(target) && target[0] && isNode(target[0]);

        const isChildNode = target =>
            isNodeArray(target) || isNode(target);

        const getChildrenKeys = node =>
            Object.keys(node).filter(key => isChildNode(node[key]));

        const traverseChildrenExpectProperty = func => (node, ctx) => {
            if (isNode(node)) {
                for (const key of getChildrenKeys(node)) {
                    if (Array.isArray(node[key])) {
                        for (let i = 0; i < node[key].length; i++) {
                            node[key][i] = node[key][i] && func(node[key][i], ctx);
                        }
                    } else {
                        if (key === 'property') {
                            continue
                        } else {
                            node[key] = func(node[key], ctx);
                        }
                    }
                }
            }
            return node;
        }
        const nodeTypeArray = [
            'FunctionDeclaration',
            'VariableDeclarator',
            'MemberExpression',
            'BinaryExpression'
        ]
        if (nodeTypeArray.includes(node.type)) {
            traverseChildrenExpectProperty((node, ctx) => {
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