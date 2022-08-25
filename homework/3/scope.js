class scope {
    constructor(type, parent) {
        this.type = type;
        this.parent = parent;
        this.variable = {};
    }
    declare(kind, name, value) {
        //需要判断不是kind的情形？
        switch (kind) {
            case 'var': {
                return this.searchAncestor().variable[name] = { 'kind': kind, 'value': value };
            }
            case 'let':
            case 'const': {
                if (kind === 'const')
                    if (this.defined(name)) {
                        throw new Error(`Uncaught SyntaxError: Identifier ${name} has already been declared`);
                    }
                return this.variable[name] = { 'kind': kind, 'value': value };
            }
        }
        throw new Error(`Keyword Error: ${kind} is not defined`);
    }
    searchAncestor() {
        let scope = this;
        while (scope.type !== 'global' && scope.type !== 'function') {
            scope = scope.parent
        }
        return scope;
    }
    defined(name) {
        if (name in this.variable) return true;
        return false;
    }
    set(node_, value) {
        let node = this;
        if (node_.type === 'MemberExpression') {
            
            while (node) {
                if (node_.object.name in node.variable) {         
                    const a = node.variable[node_.object.name].value[node_.property.name] = value;
                    return a;
                }
                else {
                    node = node.parent;
                }
            }
        }
        else {
            while (node) {
                if (node_.name in node.variable) {
                    if (node.variable[node_.name].kind === 'const') {
                        throw new TypeError('Assignment to constant variable');
                    }
                    else return node.variable[node_.name].value = value;
                }
                else {
                    node = node.parent;
                }
            }
        }
        return undefined;
    }
    get(name) {
        let node = this;
        while (node) {
            if (name in node.variable) {
                return node.variable[name].value;
            }
            else {
                node = node.parent;
            }
        }
        
        return undefined;
    }
}

module.exports = scope;