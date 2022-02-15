const acorn = require('acorn');

function evaluate(node, env) {
    switch (node.type) {
        case 'Literal':
            // TODO: 补全作业代码
            return node.value;
        case 'Program':
            evaluate(node.body, env);
        case 'ExpressionStatement':
            evaluate(node.expression, env);
        case 'BinaryExpression':
        case 'LogicalExpression':
            //BinaryOperator {
            //  "==" | "!=" | "===" | "!=="
            //  | "<" | "<=" | ">" | ">="
            //  | "<<" | ">>" | ">>>"
            //  | "+" | "-" | "*" | "/" | "%"
            //  | "**" | "||" | "^" | "&&" | "in"
            //  | "instanceof"
            //  | "|>"
            // }
            switch (node.operator) {
                case '==':
                    return evaluate(node.left, env) == evaluate(node.right, env);
                case '!=':
                    return evaluate(node.left, env) != evaluate(node.right, env);
                case '===':
                    return evaluate(node.left, env) === evaluate(node.right, env);
                case '!==':
                    return evaluate(node.left, env) !== evaluate(node.right, env);
                case '<':
                    return evaluate(node.left, env) < evaluate(node.right, env);
                case '<=':
                    return evaluate(node.left, env) <= evaluate(node.right, env);
                case '>':
                    return evaluate(node.left, env) > evaluate(node.right, env);
                case '>=':
                    return evaluate(node.left, env) >= evaluate(node.right, env);
                case '<<':
                    return evaluate(node.left, env) << evaluate(node.right, env);
                case '>>':
                    return evaluate(node.left, env) >> evaluate(node.right, env);
                case '>>>':
                    return evaluate(node.left, env) >>> evaluate(node.right, env);
                case '+':
                    return evaluate(node.left, env) + evaluate(node.right, env);
                case '-':
                    return evaluate(node.left, env) - evaluate(node.right, env);
                case '*':
                    return evaluate(node.left, env) * evaluate(node.right, env);
                case '/':
                    return evaluate(node.left, env) / evaluate(node.right, env);
                case '%':
                    return evaluate(node.left, env) % evaluate(node.right, env);
                case '**':
                    return evaluate(node.left, env) ** evaluate(node.right, env);
                case '||':
                    return evaluate(node.left, env) || evaluate(node.right, env);
                case '^':
                    return evaluate(node.left, env) ^ evaluate(node.right, env);
                case '&&':
                    return evaluate(node.left, env) && evaluate(node.right, env);
                case 'in':
                    return evaluate(node.left, env) in evaluate(node.right, env);
                case 'instanceof':
                    return evaluate(node.left, env) instanceof evaluate(node.right, env);
                    // case '|>':
                    //     return evaluate(node.left, env) | > evaluate(node.right, env);
            }
        case 'ConditionalExpression':
            return evaluate(node.test, env) ? evaluate(node.consequent, env) : evaluate(node.alternate, env);
        case 'ObjectExpression':
            let obj = {};
            for (let i in node.properties) {
                obj[node.properties[i].key.name] = evaluate(node.properties[i].value, env)
            }
            return obj;
        case 'Identifier':
            return env[node.name];
        case 'ArrayExpression':
            let arr = []
            for (i in node.elements) {
                arr[i] = evaluate(node.elements[i], env)
            }
            return arr;
        case 'CallExpression':
            let callee = evaluate(node.callee, env);
            let args = node.arguments.map(arg => evaluate(arg, env));
            return callee(...args);
        case 'ArrowFunctionExpression':
            return (...args) => {
                let argEnv = {};
                for (let i in node.params) {
                    argEnv[node.params[i].name] = args[i];
                }
                return evaluate(node.body, {...env, ...argEnv })
            }
    }

    throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function customerEval(code, env = {}) {
    const node = acorn.parseExpressionAt(code, 0, {
        ecmaVersion: 6
    })
    return evaluate(node, env)
}

module.exports = customerEval