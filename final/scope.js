class scope {
    constructor(initial = {}, parent = null, type = "global") {
        this.type = type;
        this.parent = parent;
        this.variable = initial;
    }
    declare(kind, name, value = undefined) {
        //不能重写
        if(kind === 'var' && (name === 'globalThis' || name === 'global')) return value;
        //需要判断不是kind的情形？
        switch (kind) {
            case 'var': {
                let scope = this.searchAncestor();
                return scope.variable[name] = { 'kind': kind, 'value_': value };
            }
            case 'let':
            case 'const': {
                if (this.defined(name)) throw new Error(`Uncaught SyntaxError: Identifier ${name} has already been declared`);
                return this.variable[name] = { 'kind': kind, 'value_': value };
            }
        }
        throw new Error(`Keyword Error: ${kind} is not defined`);
    }
    searchAncestor() {
        let scope = this;
        while (scope.parent && scope.type !== 'function') {
            scope = scope.parent
        }
        return scope;
    }
    defined(name) {
        if (name in this.variable) return true;
        else if (this.type === 'global' && this.parent) {
            return this.parent.defined(name);
        }
        return false;
    }
    getobject(node_) {
        let node = this;
        let searchname;
        
        if (node_.object.type === 'ThisExpression') {
            searchname = 'this';
        }
        else if (node_.object.type === 'MemberExpression') {
            let a = this.getobject(node_.object);
            if (a) return a[node_.object.property.name];
            else return undefined;
        }
        else searchname = node_.object.name;

        while (node) {
            if (searchname in node.variable) {
                if (node.variable[searchname].hasOwnProperty('value_')) {
                    return node.variable[searchname].value_;
                }
                else return node.variable[searchname];
            }
            else node = node.parent;
        }

        return undefined;
    }
    set(node_, value, continuous = undefined) {
        let node = this;
        if (node_.type === 'MemberExpression') {
            if (continuous) return continuous[node_.property.name] = value;
            let obj = this.getobject(node_);
            if (obj) return obj[node_.property.name] = value;
            else throw new Error(`Uncaught Object`);
        }
        else {
            while (node) {
                if (node_.name in node.variable) {
                    if (node.variable[node_.name].kind === 'const') {
                        throw new TypeError('Assignment to constant variable');
                    }
                    else if (!node.variable[node_.name].kind) return undefined;
                    else return node.variable[node_.name].value_ = value;
                }
                else node = node.parent;
            }
        }
        return this.declare('var', node_.name, value);
    }
    get(name) {
        let node = this;
        while (node) {
            if (name in node.variable) {
                if (node.variable[name].hasOwnProperty('value_')) {
                    return node.variable[name].value_;
                }
                else return node.variable[name];
            }
            else {
                node = node.parent;
            }
        }
        if (name in globalThis) return globalThis[name];
        else throw Error(`Uncaught ReferenceError: ${name} is not defined`);
    }
}

module.exports = scope;