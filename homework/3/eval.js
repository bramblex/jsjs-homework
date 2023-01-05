const acorn = require('acorn');
const Scope = require('./scope');

function evaluate(node, scope) {
    if (!node) return;
    switch (node.type) {
        case 'Literal':
            // TODO: 补全作业代码
            return node.value;

        case 'Identifier': // 变量名称
            return scope.get(node);

        case 'Program': {// 程序开始
            // 解释器运行时创建全局作用域
            let ret;
            const globalScope = new Scope('global', null);
            // 对程序中的函数以及变量进行声明提升
            hoisting(node, globalScope);
            for (const body of node.body) {
                if (body.type === 'FunctionDeclaration') continue;
                ret = evaluate(body, globalScope);
            };
            return ret;
        }

        case 'ExpressionStatement': // 表达式语句
            return evaluate(node.expression, scope);

        case 'BinaryExpression': // 二元表达式
        case 'LogicalExpression': { //逻辑表达式
            switch (node.operator) {
                case '==': return evaluate(node.left, scope) == evaluate(node.right, scope);
                case '!=': return evaluate(node.left, scope) != evaluate(node.right, scope);
                case '===': return evaluate(node.left, scope) === evaluate(node.right, scope);
                case '!==': return evaluate(node.left, scope) !== evaluate(node.right, scope);
                case '<': return evaluate(node.left, scope) < evaluate(node.right, scope);
                case '<=': return evaluate(node.left, scope) <= evaluate(node.right, scope);
                case '>': return evaluate(node.left, scope) > evaluate(node.right, scope);
                case '>=': return evaluate(node.left, scope) >= evaluate(node.right, scope);
                case '<<': return evaluate(node.left, scope) << evaluate(node.right, scope);
                case '>>': return evaluate(node.left, scope) >> evaluate(node.right, scope);
                case '>>>': return evaluate(node.left, scope) >>> evaluate(node.right, scope);
                case '+': return evaluate(node.left, scope) + evaluate(node.right, scope);
                case '-': return evaluate(node.left, scope) - evaluate(node.right, scope);
                case '*': return evaluate(node.left, scope) * evaluate(node.right, scope);
                case '/': return evaluate(node.left, scope) / evaluate(node.right, scope);
                case '%': return evaluate(node.left, scope) % evaluate(node.right, scope);
                case '**': return evaluate(node.left, scope) ** evaluate(node.right, scope);
                case '||': return evaluate(node.left, scope) || evaluate(node.right, scope);
                case '^': return evaluate(node.left, scope) ^ evaluate(node.right, scope);
                case '&&': return evaluate(node.left, scope) && evaluate(node.right, scope);
                case 'in': return evaluate(node.left, scope) in evaluate(node.right, scope);
                case 'instanceof': return evaluate(node.left, scope) instanceof evaluate(node.right, scope);
            }
        }

        case 'UpdateExpression': {
            switch (node.operator) {
                case '++':
                    return scope.set(node.argument, scope.get(node.argument) + 1);
                case '--':
                    return scope.set(node.argument, scope.get(node.argument) - 1);
            }
        }

        case 'UnaryExpression': {
            switch (node.operator) {
                case '-': return -evaluate(node.argument, scope);
                case '+': return +evaluate(node.argument, scope);
                case '!': return !evaluate(node.argument, scope);
                case '~': return ~evaluate(node.argument, scope);
                case 'typeof': return typeof evaluate(node.argument, scope);
            }
        }

        case 'AssignmentExpression': { // 赋值表达式
            switch (node.operator) {
                case '=': return scope.set(node.left, evaluate(node.right, scope));
                case '+=': return scope.set(node.left, scope.get(node.left) + evaluate(node.right, scope));
                case '-=': return scope.set(node.left, scope.get(node.left) - evaluate(node.right, scope));
                case '*=': return scope.set(node.left, scope.get(node.left) * evaluate(node.right, scope));
                case '/=': return scope.set(node.left, scope.get(node.left) / evaluate(node.right, scope));
            }
        }

        case 'MemberExpression': {
            return scope.get(node);
        }

        case 'ConditionalExpression': // 三元表达式
            return evaluate(node.test, scope) ? evaluate(node.consequent, scope) : evaluate(node.alternate, scope);

        case 'SequenceExpression': // 序列表达式
            return node.expressions.reduce((_, expression) => evaluate(expression, scope), {});

        case 'ObjectExpression': { // 对象表达式
            let obj = {};
            node.properties.forEach((_, i) => {
                obj[node.properties[i].key.name] = evaluate(node.properties[i].value, scope);
            })
            return obj;
        }

        case 'ArrayExpression': {// 数组表达式
            let arr = []
            node.elements.forEach((_, i) => {
                arr[i] = evaluate(node.elements[i], scope);
            })
            return arr;
        }

        case 'CallExpression': {// 调用表达式
            let callee = evaluate(node.callee, scope);
            let args = node.arguments.map(arg => evaluate(arg, scope));
            return callee(...args);
        }

        case 'FunctionExpression': // 函数表达式
        case 'ArrowFunctionExpression': { // 箭头函数表达式
            return (...args) => {
                const functionScope = new Scope('function', scope);
                node.params.forEach(function (par, i) {
                    functionScope.init('let', par.name, args[i]);
                })
                return evaluate(node.body, functionScope);
            }
        }

        case 'BlockStatement': { // 块
            let ret;
            hoisting(node, scope); // 对函数和变量进行声明提升
            for (const body of node.body) {
                if (body.type === 'FunctionDeclaration') continue;
                ret = evaluate(body, scope);
                if (ret && ret.type) {
                    switch (ret.type) {
                        case 'continue':
                        case 'break':
                            return ret;
                    }
                }
            };
            return ret;
        }

        case 'IfStatement': {// if
            if (evaluate(node.test, scope)) {
                const ifScope = new Scope('block', scope);
                return evaluate(node.consequent, ifScope);
            } else {
                const ifScope = new Scope('block', scope);
                return evaluate(node.alternate, ifScope);
            }
        }

        case 'SwitchStatement': {// switch
            let ret;
            const switchScope = new Scope('block', scope);
            node.cases.reduce((_, cases) => {
                if (evaluate(node.discriminant, switchScope) === evaluate(cases.test, switchScope)) {
                    cases.consequent.reduce((_, cons) => { ret = evaluate(cons, switchScope) }, {});
                }
            }, {});
            return ret;
        }

        case 'LabeledStatement': {
            scope.controlFlowLabel = node.label.name;
            return evaluate(node.body, scope);
        }

        case 'ForStatement': {// for 循环
            let ret;
            let label = scope.controlFlowLabel;
            const forScope = new Scope('block', scope);
            for (evaluate(node.init, forScope); evaluate(node.test, forScope); evaluate(node.update, forScope)) {
                ret = evaluate(node.body, forScope);
                if (ret && ret.type) {
                    switch (ret.type) {
                        case 'continue':
                            if (ret.label === label) { continue } else { return ret };
                        case 'break':
                            if (ret.label === label) { break } else { return ret };
                    }
                    return;
                }
            }
            return;
        }

        case 'WhileStatement': {// while 循环
            let ret;
            let label = scope.controlFlowLabel;
            const whileScope = new Scope('block', scope);
            while (evaluate(node.test, whileScope)) {
                ret = evaluate(node.body, whileScope);
                if (ret && ret.type) {
                    switch (ret) {
                        case 'continue':
                            if (ret.label === label) { continue } else { return ret };
                        case 'break':
                            if (ret.label === label) { continue } else { return ret };
                    }
                    return;
                }
            }
            return;
        }

        case 'ReturnStatement': // return
            return evaluate(node.argument, scope);

        case 'ContinueStatement': {// continue
            let ret = {};
            ret.type = 'continue';
            if (node.label) {
                ret.label = node.label.name;
            }
            return ret;
        }

        case 'BreakStatement': {// break
            let ret = {};
            ret.type = 'break';
            if (node.label) {
                ret.label = node.label.name;
            }
            return ret;
        }

        case 'VariableDeclaration': { // 变量声明(变量初始化)
            node.declarations.forEach((dec) => scope.init(node.kind, dec.id.name, evaluate(dec.init, scope)));
            return;
        }

        case 'TryStatement': {
            try {
                const tryScope = new Scope('block', scope);
                evaluate(node.block, tryScope);
            } catch (err) {
                let ret;
                const catchScope = new Scope('block', scope);
                catchScope.init('let', node.handler.param.name, err);
                ret = evaluate(node.handler.body, catchScope);
                return ret;
            } finally {
                const finallyScope = new Scope('block', scope);
                evaluate(node.finalizer, finallyScope);
            }
        }

        case 'ThrowStatement': {
            throw evaluate(node.argument, scope);
        }
    }
    throw new Error(`Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`);
}

function hoisting(node, scope) { // 变量以及函数声明提升
    node.body.forEach((node) => {
        switch (node.type) {
            case 'VariableDeclaration': { // 变量声明
                node.declarations.forEach((dec) => scope.declare(node.kind, dec.id.name, undefined));
                return;
            }

            case 'FunctionDeclaration': { // 函数声明
                return scope.init('var', node.id.name, function (...args) {
                    node.params.forEach((param, i) => {
                        scope.init('let', param.name, args[i])
                    })
                    return evaluate(node.body, scope);
                });
            }
        }
    })
}

function customerEval(code, env = {}) {
    const node = acorn.parse(code, {
        ecmaVersion: 6
    })
    return evaluate(node, env)
}

module.exports = customerEval