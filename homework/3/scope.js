class Scope {
    constructor(type, parent) {
        // 解释器运行起来的时候，就需要定义一个全局作用域 global
        this.type = type; // global || function || block
        this.parent = parent;
        this.variables = {};
        this.controlFlowLabel = {};
    }

    declare(kind, name, init) {
        // kind：var / const / let 不同情况定义的位置也不相同
        switch (kind) {
            case 'var': {
                if (this.type == 'function' || this.type == 'global') {
                    this.variables[name] = {
                        kind: kind,
                        value: init,
                        initialized: true
                    }
                } else {
                    this.parent.declare(kind, name, init);
                }
                return;
            }
            case 'const':
            case 'let': {
                if (this.variables[name]) {
                    throw new SyntaxError(`Identifier '${name}' has already been declared`);
                } else {
                    this.variables[name] = {
                        kind: kind,
                        value: init,
                        initialized: false
                    }
                }
                return;
            }
        }
        return;
    }

    init(kind, name, init) {
        switch (kind) {
            case 'var': {
                if (this.type == 'function' || this.type == 'global') {
                    this.variables[name] = {
                        kind: kind,
                        value: init,
                        initialized: true
                    }
                } else {
                    this.parent.init(kind, name, init);
                }
                return;
            }
            case 'const':
            case 'let': {
                this.variables[name] = {
                    kind: kind,
                    value: init,
                    initialized: true
                }
                return;
            }
        }
    }

    get(node) {
        // 如果当前作用域里面没有找到该变量，就去父节点作用域里面找
        // 找不到就返回 "name" is not defined
        if (node.type === 'MemberExpression') {
            if (this.variables[node.object.name]) {
                if (this.variables[node.object.name].value[node.property.value]) { // 判断是否是数组类型
                    return this.variables[node.object.name].value[node.property.value];
                } else if (this.variables[node.object.name].value[node.property.name]) {
                    return this.variables[node.object.name].value[node.property.name];
                } else {
                    return undefined;
                }
            } else {
                if (this.parent != null) {
                    return this.parent.get(node);
                } else {
                    throw new ReferenceError(`'${node.name}' is not defined`);
                }
            }
        } else {
            if (this.variables[node.name]) {
                if (this.variables[node.name].kind === 'var') {
                    return this.variables[node.name].value;
                } else if (this.variables[node.name].initialized){
                    return this.variables[node.name].value;
                } else {
                    throw new ReferenceError(`Cannot access '${node.name}' before initialization`);
                }
            } else {
                if (this.parent != null) {
                    return this.parent.get(node);
                } else {
                    throw new ReferenceError(`'${node.name}' is not defined`);
                }
            }
        }
    }

    set(node, value) {
        if (node.type === 'MemberExpression') {
            if (this.variables[node.object.name]) {
                if (this.variables[node.object.name].value[node.property.value]) {
                    this.variables[node.object.name].value[node.property.value] = value;
                } else {
                    this.variables[node.object.name].value[node.property.name] = value;
                }
            } else {
                if (this.parent != null) {
                    return this.parent.set(node, value);
                } else {
                    this.variables[node.object.name] = {
                        kind: null,
                        value: {}
                    }
                    this.variables[node.object.name].value[node.property.name] = value;
                }
            }
        } else {
            if (this.variables[node.name]) {
                if (this.variables[node.name].kind === 'const') {
                    throw new TypeError('Assignment to constant variable');
                } else {
                    return this.variables[node.name].value = value;
                }
            } else {
                if (this.parent != null) {
                    return this.parent.set(node, value);
                } else {
                    this.variables[node.name] = {
                        kind: 'var',
                        value: value
                    }
                    // throw new ReferenceError(`${node.name} is not defined`);
                }
            }
        }
    }
}
module.exports = Scope;