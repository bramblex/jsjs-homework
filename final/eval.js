const acorn = require('acorn');
const Scope = require('./scope');

function evaluate(node, scope, optional) {
    return _evaluate.call(this, node, scope, optional).next();
}
function* _evaluate(node, scope, optional) {
    if (!node) return;
    switch (node.type) {
        case "Literal":
            // TODO: 补全作业代码
            return node.value;

        case "Identifier": // 变量名称
            return scope.get(node.name).value;

        case "Program": {
            // 程序开始
            // 解释器运行时创建全局作用域
            let ret;
            const globalScope = new Scope({}, scope, "global");
            // 对程序中的函数以及变量进行声明提升
            hoisting(node, globalScope);
            for (const body of node.body) {
                if (body.type === "FunctionDeclaration") continue;
                ret = _evaluate.call(this, body, globalScope).next().value;
            }
            if (ret?.type) {
                if (ret.type === "return") return ret.value;
            } else return ret;
        }

        case "ExpressionStatement": { // 表达式语句
            let ret;
            let gen = _evaluate.call(this, node.expression, scope);
            while (true) {
                ret = gen.next();
                if (ret?.done) {
                    ret = ret.value;
                    break;
                } else {
                    yield ret.value;
                }
            } return ret;
        }

        case "BinaryExpression": // 二元表达式
        case "LogicalExpression": {
            //逻辑表达式
            let leftGen = _evaluate.call(this, node.left, scope);
            let rightGen = _evaluate.call(this, node.right, scope);
            let left, right;
            while (true) {
                left = leftGen.next();
                if (left?.done) {
                    left = left.value;
                    break;
                } else {
                    yield left.value;
                }
            }
            while (true) {
                right = rightGen.next();
                if (right?.done) {
                    right = right.value;
                    break;
                } else {
                    yield right.value;
                }
            }
            switch (node.operator) {
                case "==":
                    return left == right;
                case "!=":
                    return left != right;
                case "===":
                    return left === right;
                case "!==":
                    return left !== right;
                case "<":
                    return left < right;
                case "<=":
                    return left <= right;
                case ">":
                    return left > right;
                case ">=":
                    return left >= right;
                case "<<":
                    return left << right;
                case ">>":
                    return left >> right;
                case ">>>":
                    return left >>> right;
                case "+":
                    return left + right;
                case "-":
                    return left - right;
                case "*":
                    return left * right;
                case "/":
                    return left / right;
                case "%":
                    return left % right;
                case "**":
                    return left ** right;
                case "|":
                    return left | right;
                case "||":
                    return left || right;
                case "^":
                    return left ^ right;
                case "&":
                    return left & right;
                case "&&":
                    return left && right;
                case "in":
                    return left in right;
                case "instanceof":
                    return left instanceof right;
            }
        }

        case "UpdateExpression": {
            let name,
                value,
                property = null;
            if (node.argument.type === "Identifier") {
                name = node.argument.name;
                value = _evaluate.call(this, node.argument, scope).next().value;
            } else if (node.argument.type === "MemberExpression") {
                node.argument.object.type === "ThisExpression"
                    ? (name = "this")
                    : (name = node.argument.object.name);
                value = _evaluate.call(this, node.argument, scope).next().value;
                property = node.argument.computed
                    ? _evaluate.call(this, node.argument.property, scope).next().value
                    : node.argument.property.name;
            }
            switch (node.operator) {
                case "++":
                    return scope.set(name, value + 1, property);
                case "--":
                    return scope.set(name, value - 1, property);
            }
        }

        case "UnaryExpression": {
            let ret;
            switch (node.operator) {
                case "-":
                    return - _evaluate.call(this, node.argument, scope).next().value;
                case "+":
                    return + _evaluate.call(this, node.argument, scope).next().value;
                case "!":
                    return !_evaluate.call(this, node.argument, scope).next().value;
                case "~":
                    return ~_evaluate.call(this, node.argument, scope).next().value;
                case "typeof": {
                    try {
                        ret = typeof _evaluate.call(this, node.argument, scope).next().value;
                    } catch (err) {
                        ret = "undefined";
                    }
                    return ret;
                }
                case "void": {
                    _evaluate.call(this, node.argument, scope).next().value;
                    return undefined;
                }
                case "delete": {
                    if (node.argument.type === "MemberExpression") {
                        if (node.argument.computed) {
                            return delete _evaluate.call(this, node.argument.object, scope).next().value[
                                _evaluate.call(this, node.argument.property, scope).next().value
                            ];
                        } else {
                            return delete _evaluate.call(this, node.argument.object, scope).next().value[
                                node.argument.property.name
                            ];
                        }
                    }
                }
            }
        }

        case "AssignmentExpression": {
            // 赋值表达式
            let name,
                value,
                property = null;
            if (node.left.type === "Identifier") {
                name = node.left.name;
                value = _evaluate.call(this, node.right, scope).next().value;
                switch (node.operator) {
                    case "=":
                        return scope.set(name, value, property);
                    case "+=":
                        return scope.set(name, scope.get(name).value + value, property);
                    case "-=":
                        return scope.set(name, scope.get(name).value - value, property);
                    case "*=":
                        return scope.set(name, scope.get(name).value * value, property);
                    case "/=":
                        return scope.set(name, scope.get(name).value / value, property);
                    case "%=":
                        return scope.set(name, scope.get(name).value % value, property);
                }
            } else if (node.left.type === "MemberExpression") {
                if (node.left.object.name === "module") name = scope.get("module");
                else name = _evaluate.call(this, node.left.object, scope).next().value;
                property = node.left.computed
                    ? _evaluate.call(this, node.left.property, scope).next().value
                    : node.left.property.name;
                value = _evaluate.call(this, node.right, scope).next().value;
                switch (node.operator) {
                    case "=":
                        return (name[property] = value);
                    case "+=":
                        return (name[property] += value);
                    case "-=":
                        return (name[property] -= value);
                    case "*=":
                        return (name[property] *= value);
                    case "/=":
                        return (name[property] /= value);
                    case "%=":
                        return (name[property] %= value);
                }
            }
        }

        case "ConditionalExpression": // 三元表达式
            return _evaluate.call(this, node.test, scope).next().value
                ? _evaluate.call(this, node.consequent, scope).next().value
                : _evaluate.call(this, node.alternate, scope).next().value;

        case "SequenceExpression": // 序列表达式
            return node.expressions.reduce(
                (_, expression) => _evaluate.call(this, expression, scope).next().value,
                {}
            );

        case "ObjectExpression": {
            // 对象表达式
            const obj = {};
            node.properties.forEach((prop) => {
                let key, value;
                if (prop.key.type === "Literal") key = _evaluate.call(this, prop.key, scope).next().value;
                else if (prop.key.type === "Identifier") key = prop.key.name;
                // 如果对象的属性值为函数的话，要传入 key
                value = _evaluate.call(this, prop.value, scope, key).next().value;
                if (prop.kind === "init") obj[key] = value;
                else if (prop.kind === "get")
                    Object.defineProperty(obj, key, { get: value });
                else if (prop.kind === "set")
                    Object.defineProperty(obj, key, { set: value });
            });
            return obj;
        }

        case "ArrayExpression": {
            // 数组表达式
            let arr = [];
            node.elements.forEach((_, i) => {
                arr[i] = _evaluate.call(this, node.elements[i], scope).next().value;
            });
            return arr;
        }

        case "MemberExpression": {
            if (node.computed) {
                return _evaluate.call(this, node.object, scope).next().value[_evaluate.call(this, node.property, scope).next().value];
            } else {
                return _evaluate.call(this, node.object, scope).next().value[node.property.name];
            }
        }

        case "ThisExpression": {
            let thisValue = scope.get("this");
            return thisValue ? thisValue.value : undefined;
        }

        case "NewExpression": {
            let callee = _evaluate.call(this, node.callee, scope).next().value;
            if (typeof callee.value === "function") callee = callee.value;
            let args = node.arguments.map((arg) => _evaluate.call(this, arg, scope).next().value);
            scope.declare(null, "newTarget", callee, true);
            return new (callee.bind.apply(callee, [null].concat(args)))();
        }

        case "CallExpression": {
            // 调用表达式
            const callScope = new Scope({}, scope, "function");
            let callee = _evaluate.call(this, node.callee, callScope).next().value;
            let args = node.arguments.map((arg) => _evaluate.call(this, arg, callScope).next().value);
            if (node.callee.type === "MemberExpression") {
                if (typeof callee === "function") {
                    let object = _evaluate.call(this, node.callee.object, callScope).next().value;
                    return callee.apply(object, args);
                } else {
                    throw new TypeError(
                        `${node.callee.object.name}.${_evaluate.call(this,
                            node.callee.property,
                            callScope
                        ).next().value} is not a function`
                    );
                }
            } else {
                if (typeof callee === "function") {
                    let thisValue = callScope.get("this");
                    return callee.apply(thisValue ? thisValue.value : undefined, args);
                } else {
                    throw new TypeError(`${node.callee.name} is not a function`);
                }
            }
        }

        case "ArrowFunctionExpression": {
            // 箭头函数
            return (...args) => {
                // 创建函数对象
                const functionScope = new Scope({}, scope, "function");
                // functionScope.declare('this', 'this', this, true); // 箭头函数的 this 在定义的时候已经绑定好了
                node.params.forEach(function (par, i) {
                    functionScope.declare("let", par.name, args[i], true);
                });
                let ret = _evaluate.call(this, node.body, functionScope).next().value;
                if (ret?.type === "return") return ret.value;
                else return ret;
            };
        }
        case "FunctionExpression": {
            // 函数表达式
            const func = function (...args) {
                // 创建函数对象
                const functionScope = new Scope({}, scope, "function");
                functionScope.declare(null, "this", this, true);
                node.params.forEach(function (par, i) {
                    functionScope.declare("let", par.name, args[i], true);
                });
                let ret = _evaluate.call(this, node.body, functionScope).next().value;
                if (ret?.type === "return") return ret.value;
                else return ret;
            };
            // 为函数对象添加属性
            if (node.id) {
                // 使用定义变量的方式命名函数时，如果函数本身有 name，则使用自身的 name
                Object.defineProperty(func, "name", {
                    get() {
                        return node.id.name;
                    },
                });
            } else if (optional) {
                // 若自身没有 name，要接受上一个节点传过来的 name
                Object.defineProperty(func, "name", {
                    get() {
                        return optional;
                    },
                });
            }
            Object.defineProperty(func, "length", {
                get() {
                    return node.params.length;
                },
            });
            return func;
        }

        case "AwaitExpression":
        case "YieldExpression": {
            yield _evaluate.call(this, node.argument, scope).next().value;
            return;
        }

        case "BlockStatement": {
            // 块
            const blockScope = new Scope({}, scope, "block");
            let ret;
            hoisting(node, blockScope); // 对函数和变量进行声明提升
            for (const body of node.body) {
                if (body && body.type === 'FunctionDeclaration') continue;
                let gen = _evaluate.call(this, body, blockScope);
                while (true) {
                    ret = gen.next();
                    if (ret?.done) {
                        ret = ret.value;
                        break;
                    } else {
                        yield ret.value;
                    }
                }
                if (ret?.type) {
                    if (
                        ret.type === 'break' ||
                        ret.type === 'continue' ||
                        ret.type === 'return'
                    ) return ret;
                }
            } return
        }

        case "IfStatement": {
            // if
            if (_evaluate.call(this, node.test, scope).next().value) {
                const ifScope = new Scope({}, scope, "block");
                return _evaluate.call(this, node.consequent, ifScope).next().value;
            } else {
                const ifScope = new Scope({}, scope, "block");
                return _evaluate.call(this, node.alternate, ifScope).next().value;
            }
        }

        case "SwitchStatement": {
            // switch
            let ret;
            const switchScope = new Scope({}, scope, "block");
            for (const cases of node.cases) {
                if (
                    _evaluate.call(this, node.discriminant, switchScope).next().value ===
                    _evaluate.call(this, cases.test, switchScope).next().value ||
                    cases.test === null
                ) {
                    ret = _evaluate.call(this, cases, switchScope).next().value;
                }
                if (ret?.type) {
                    if (ret.type === "break") break;
                    else if (
                        ret.type === "continue" ||
                        ret.type === "return"
                    )
                        return ret;
                }
            }
            return;
        }

        case "SwitchCase": {
            for (const consequent of node.consequent) {
                ret = _evaluate.call(this, consequent, scope).next().value;
                if (ret?.type) {
                    if (
                        ret.type === "break" ||
                        ret.type === "continue" ||
                        ret.type === "return"
                    )
                        return ret;
                }
            }
            return;
        }

        case "LabeledStatement": {
            return _evaluate.call(this, node.body, scope, node.label.name).next().value;
        }

        case "ForStatement": {
            // for 循环
            let label = optional ? optional : undefined;
            const forScope = new Scope({}, scope, "block");
            for (
                node.init ? _evaluate.call(this, node.init, forScope).next().value : null;
                node.test ? _evaluate.call(this, node.test, forScope).next().value : true;
                node.update ? _evaluate.call(this, node.update, forScope).next().value : void 0
            ) {
                let ret = _evaluate.call(this, node.body, forScope).next().value;
                if (ret?.type) {
                    if (ret.type === "continue") {
                        if (ret.label === label || ret.label === undefined) continue;
                        else return ret;
                    } else if (ret.type === "break") {
                        if (ret.label === label || ret.label === undefined) break;
                        else return ret;
                    } else if (ret.type === "return" || ret.type === "yield") return ret;
                }
            }
            return;
        }

        case "WhileStatement": {
            // while 循环
            let label = optional ? optional : undefined;
            const whileScope = new Scope({}, scope, "block");
            while (_evaluate.call(this, node.test, whileScope).next().value) {
                let ret = _evaluate.call(this, node.body, whileScope).next().value;
                if (ret?.type) {
                    if (ret.type === "continue") {
                        if (ret.label === label || ret.label === undefined) continue;
                        else return ret;
                    } else if (ret.type === "break") {
                        if (ret.label === label || ret.label === undefined) break;
                        else return ret;
                    } else if (ret.type === "return" || ret.type === "yield") return ret;
                }
            }
            return;
        }

        case "DoWhileStatement": {
            let label = optional ? optional : undefined;
            const doWhileScope = new Scope({}, scope, "block");
            do {
                let ret = _evaluate.call(this, node.body, doWhileScope).next().value;
                if (ret?.type) {
                    if (ret.type === "continue") {
                        if (ret.label === label || ret.label === undefined) continue;
                        else return ret;
                    } else if (ret.type === "break") {
                        if (ret.label === label || ret.label === undefined) break;
                        else return ret;
                    } else if (ret.type === "return" || ret.type === "yield") return ret;
                }
            } while (_evaluate.call(this, node.test, doWhileScope).next().value);
        }

        case "ReturnStatement": {
            // return
            let ret = {};
            ret.type = "return";
            ret.value = _evaluate.call(this, node.argument, scope).next().value;
            return ret;
        }

        case "ContinueStatement": {
            // continue
            let ret = {};
            ret.type = "continue";
            if (node.label) {
                ret.label = node.label.name;
            }
            return ret;
        }

        case "BreakStatement": {
            // break
            let ret = {};
            ret.type = "break";
            if (node.label) {
                ret.label = node.label.name;
            }
            return ret;
        }

        case "VariableDeclaration": {
            // 变量声明(变量初始化)
            // 如果变量名是函数的话，要函数表达式节点传入变量的 name
            for (const dec of node.declarations) {
                let gen = _evaluate.call(this, dec.init, scope, dec.id.name);
                let value;
                while (true) {
                    value = gen.next();
                    if (value?.done) {
                        value = value.value;
                        break;
                    } else {
                        yield value.value;
                    }
                }
                return scope.declare(
                    node.kind,
                    dec.id.name,
                    value,
                    true
                );
            }
        }

        case "TryStatement": {
            try {
                return _evaluate.call(this, node.block, scope).next().value;
            } catch (err) {
                if (node.handler) {
                    scope.declare("let", node.handler.param.name, err, true);
                    return _evaluate.call(this, node.handler.body, scope).next().value;
                }
            } finally {
                if (node.finalizer) {
                    return _evaluate.call(this, node.finalizer, scope).next().value;
                }
            }
        }

        case "ThrowStatement": {
            throw _evaluate.call(this, node.argument, scope).next().value;
        }

        case "MetaProperty": {
            return scope.get("newTarget").value;
        }
    }
    throw new Error(
        `Unsupported Syntax ${node.type} at Location ${node.start}:${node.end}`
    );
}

function hoisting(node, scope) {
    // 变量以及函数声明提升
    node.body.forEach((node) => {
        switch (node.type) {
            case "VariableDeclaration": {
                // 变量声明
                node.declarations.forEach((dec) =>
                    scope.declare(node.kind, dec.id.name, undefined, false)
                );
                return;
            }

            case "FunctionDeclaration": {
                // 函数声明
                if (node.generator) {
                    // generator 函数声明
                    const generator = function* (...args) {
                        const generatorScope = new Scope({}, scope, "function");
                        generatorScope.declare(null, "this", this, true);
                        node.params.forEach((param, i) => {
                            generatorScope.declare("let", param.name, args[i], true);
                        });
                        let ret;
                        let gen = _evaluate.call(this, node.body, generatorScope);
                        while (true) {
                            ret = gen.next();
                            if (ret?.done) {
                                ret = ret.value;
                                break;
                            } else {
                                yield ret.value;
                            }
                        }
                        if (ret?.type === "return") return ret.value;
                        else return ret;
                    };
                    Object.defineProperty(generator, "name", {
                        get() {
                            return node.id.name;
                        },
                    });
                    Object.defineProperty(generator, "length", {
                        get() {
                            return node.params.length;
                        },
                    });
                    return scope.declare("const", node.id.name, generator, true);
                } else if (node.async) { // async函数声明
                    const generator = function* (...args) {
                        const generatorScope = new Scope({}, scope, "function");
                        generatorScope.declare(null, "this", this, true);
                        node.params.forEach((param, i) => {
                            generatorScope.declare("let", param.name, args[i], true);
                        });
                        let ret;
                        let gen = _evaluate.call(this, node.body, generatorScope);
                        while (true) {
                            ret = gen.next();
                            if (ret?.done) {
                                ret = ret.value;
                                break;
                            } else {
                                yield ret.value;
                            }
                        }
                        if (ret?.type === "return") return ret.value;
                        else return ret;
                    };
                    const async = function () { // 用 generator 表示 async
                        let ret;
                        let gen = generator.apply(this, arguments);
                        return new Promise(function (resolve, reject) {
                            function step(prop, value) {
                                try {
                                    ret = gen[prop](value);
                                } catch (error) {
                                    reject(error);
                                    return;
                                }
                                if (ret.done) {
                                    resolve(ret.value);
                                } else {
                                    return Promise.resolve(ret.value).then(
                                        (value) => {
                                            return step('next', value);
                                        },
                                        (error) => {
                                            return step('throw', error)
                                        });
                                }
                            }
                            return step('next');
                        });
                    };
                    Object.defineProperty(async, "name", {
                        get() {
                            return node.id.name;
                        },
                    });
                    Object.defineProperty(async, "length", {
                        get() {
                            return node.params.length;
                        },
                    });
                    return scope.declare("const", node.id.name, async, true);
                } else {
                    // 普通函数声明
                    const func = function (...args) {
                        // 定义函数对象
                        const functionScope = new Scope({}, scope, "function");
                        functionScope.declare(null, "this", this, true);
                        node.params.forEach((param, i) => {
                            functionScope.declare("let", param.name, args[i], true);
                        });
                        let ret = _evaluate.call(this, node.body, functionScope).next().value;
                        if (ret?.type === "return") return ret.value;
                        else return ret;
                    };
                    // 为函数对象添加属性
                    Object.defineProperty(func, "name", {
                        get() {
                            return node.id.name;
                        },
                    });
                    Object.defineProperty(func, "length", {
                        get() {
                            return node.params.length;
                        },
                    });
                    return scope.declare("const", node.id.name, func, true);
                }
            }
        }
    });
}

function customEval(code, parent) {
    const scope = new Scope({
        module: {
            exports: {}
        }
    }, parent);

    const node = acorn.parse(code, {
        ecmaVersion: 8
    })
    evaluate(node, scope);

    return scope.get('module').exports;
}

module.exports = {
    customEval,
    Scope,
}