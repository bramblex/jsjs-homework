class Scope {
    constructor(initial /* 初始化变量 */, parent, type = 'block') {
        this.variables = {};
        for (const key in initial) {
            this.variables[key] = new Value(initial[key])
        }
        this.type = type; // 'funcition' | 'block'
        this.parent = parent;
    }
    declare(kind = 'var', name, initValue = undefined) {
        if (kind === 'var') {
            if (globalThis.global !== undefined && name === 'global') return new Value(initValue);
            if (globalThis.window !== undefined && name === 'window') return new Value(initValue);
            if (name === 'globalThis') return new Value(initValue);
        }

        if (kind === 'var') {
            // 把变量声明提升至函数体顶部
            let scope = this
            while (scope.parent && scope.type !== 'function') { scope = scope.parent }
            scope.variables[name] = new Value(initValue, 'var')
            return this.variables[name]?.value
        } else if (kind === 'let') {
            if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
            this.variables[name] = new Value(initValue, 'let')
            return this.variables[name]?.value
        } else if (kind === 'const') {
            if (name in this.variables) { throw new SyntaxError(`Identifier ${name} has already been declared`) }
            this.variables[name] = new Value(initValue, 'const')
            return this.variables[name]?.value
        } else {
            throw new Error(`canjs: Invalid Variable Declaration Kind of "${kind}"`)
        }
    }
    get(name) {
        if (name in this.variables) {
            return this.variables[name].value
        }
        else if (this.parent) { return this.parent.get(name) }
        else if (name in globalThis) { return globalThis[name] }
        throw new ReferenceError(`${name} is not defined`)
    }
    set(name, value) {
        if (globalThis.global !== undefined && name === 'global') return new Value(value);
        if (globalThis.window !== undefined && name === 'window') return new Value(value);
        if (name === 'globalThis') return new Value(value);
        if (name in this.variables) { this.variables[name].set(value) }
        else if (this.parent) { this.parent.set(name, value) }
        else this.declare('var', name, value)
    }
    copyFromParent() {
        if (this.parent === undefined) throw new Error('this scope has no parent!')
        for (const valName in this.parent.variables) {
            this.declare('let', valName, this.parent.get(valName))
        }
    }
}

class Value {
    constructor(value, kind = 'let') {
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

class BlockInterruption {
    constructor(type, value) {
        this.type = type
        this.value = value
    }
    getType() {
        return this.type
    }
    setLabel(label) {
        this.label = label
    }
    getLabel() {
        return this.label
    }
}
module.exports = {
    Scope, BlockInterruption
}