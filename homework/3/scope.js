class Value {
    constructor(value, kind = '') {
        this.value = value
        this.kind = kind
    }
    set(value) {
        // 禁止重新对const类型变量赋值    
        if (this.kind === 'const') {
            throw new TypeError('Assignment to constant variable')
        } else {
            this.value = value
        }
    }
    get() { return this.value }
}

class Scope {
    constructor(type, parent) {
        this.variables = {};
        this.type = type; // 'funcition' | 'block'
        this.parent = parent;
    }
    declare(kind = 'var', name, initValue = undefined) {
        if (kind === 'var') {
            // 把变量声明提升至函数体顶部
            let scope = this
            while (scope.parent && scope.type !== 'function') { scope = scope.parent }
            scope.variables[name] = new Value(initValue, 'var')
            return this.variables[name]
        } else if (kind === 'let') {
            if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
            this.variables[name] = new Value(initValue, 'let')
            return this.variables[name]
        } else if (kind === 'const') {
            if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
            this.variables[name] = new Value(initValue, 'const')
            return this.variables[name]
        } else {
            throw new Error(`canjs: Invalid Variable Declaration Kind of "${kind}"`)
        }
    }
    get(name) {
        if (this.variables[name]) {
            return this.variables[name].value
        }
        else if (this.parent) { return this.parent.get(name) }
        else if (global[name]) { return global[name] }
        throw new ReferenceError(`${name} is not defined`)
    }
    set(name, value) {
        if (this.variables[name]) { this.variables[name].set(value) }
        else if (this.parent) { this.parent.set(name, value) }
    }
}
module.exports = Scope