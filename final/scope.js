const standardMap = require("./standard"); // 注入标准库
class Scope {
    constructor(variables, parent, type) {
        // 解释器运行起来的时候，就需要定义一个全局作用域 global
        this.type = type; // global || function || block
        this.parent = parent;
        this.variables = variables;
        this.globalScope = standardMap;
    }

    declare(kind, name, initValue, initialized) {
        // kind：var / const / let 不同情况定义的位置也不相同
        switch (kind) {
            case "var": {
                if (this.type === "global" && this.find(name)) {
                    // 查找全局上下文中是否有该变量，如果有则不能更改上下文的值
                    return;
                } else if (this.parent.type === "function") {
                    if (initialized === false && this.find(name)) return; // 如果是函数执行上下文，则只跳过声明提升
                }
                if (this.type === "function" || this.type === "global") {
                    this.variables[name] = {
                        kind: kind,
                        value: initValue,
                        initialized: true,
                    };
                } else {
                    this.parent.declare(kind, name, initValue);
                }
                return;
            }
            case "const":
            case "let": {
                if (this.type === "global" || this.parent.type === "function") {
                    if (this.find(name))
                        throw new SyntaxError(
                            `Identifier '${name}' has already been declared`
                        );
                }
                if (this.variables[name] && this.variables[name].initialized === true) {
                    throw new SyntaxError(
                        `Identifier '${name}' has already been declared`
                    );
                } else {
                    this.variables[name] = {
                        kind: kind,
                        value: initValue,
                        initialized: initialized,
                    };
                }
                return;
            }
            default: {
                this.variables[name] = {
                    kind: kind,
                    value: initValue,
                    initialized: initialized,
                };
            }
        }
        return;
    }

    get(name) {
        if (name === null) {
            return { value: null };
        } else {
            if (name === "undefined") {
                return { value: undefined };
            } else {
                if (this.variables && this.variables[name]) {
                    if (this.parent === undefined) return { value: this.variables[name] };
                    if (
                        this.variables[name].kind === "let" ||
                        this.variables[name].kind === "const"
                    ) {
                        if (this.variables[name].initialized === false) {
                            throw new SyntaxError(
                                `Cannot access '${name}' before initialization`
                            );
                        }
                    }
                    return this.variables[name];
                } else {
                    if (this.parent !== undefined) {
                        return this.parent.get(name);
                    } else {
                        if (this.globalScope[name]) {
                            return { value: this.globalScope[name] };
                        } else if (name === "this") return null;
                        else if (name === "newTarget") return { value: undefined };
                        else throw new ReferenceError(`${name} is not defined`);
                    }
                }
            }
        }
    }

    set(name, value, property) {
        if (property) {
            if (this.variables[name]) {
                if (name === "module") {
                    return (this.variables[name][property] = value);
                } else {
                    return (this.variables[name].value[property] = value);
                }
            } else {
                if (this.type !== "global" || name === "module") {
                    return this.parent.set(name, value, property);
                } else {
                    this.variables[name] = {
                        kind: "var",
                        value: {},
                    };
                    return (this.variables[name].value[property] = value);
                }
            }
        } else {
            if (this.variables[name]) {
                if (this.variables[name].kind === "const") {
                    throw new TypeError("Assignment to constant variable");
                } else {
                    return (this.variables[name].value = value);
                }
            } else {
                if (this.type !== "global") {
                    return this.parent.set(name, value);
                } else {
                    this.variables[name] = {
                        kind: "var",
                        value: value,
                        initialized: true,
                    };
                }
            }
        }
    }

    find(name) {
        if (this.parent === undefined || this.type === "function") {
            if (this.variables && this.variables[name]) return true;
            else return false;
        } else return this.parent.find(name);
    }
}

module.exports = Scope;
