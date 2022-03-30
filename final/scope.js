
class Scope {
	constructor(type, parent = null) { // global, function, block
		this.type = type;
		this.parent = parent;
		this.content = new Map();
	}

	getFunctionScope() {
		let scope = this;
		while (scope.parent) {
			if (scope.type === 'function') {
				return scope;
			}
			scope = scope.parent;
		}
		return scope;
	}

	declare(kind, name) {
		if (kind === 'var') {
			const functionScope = this.getFunctionScope();
			const variable = functionScope.content.get(name) || { kind, init: false, value: undefined };
			functionScope.content.set(name, variable);
		} else {
			const variable = { kind, init: false, value: undefined };
			this.content.set(name, variable)
		}
	}


	set(name, value) {
		if (this.content.has(name)) {
			const variable = this.content.get(name);
			if (variable.kind === 'const' && variable.init === true) {
				throw new TypeError(`Assignment to constant variable.`);
			}
			variable.init = true;
			variable.value = value;
		} else {
			if (!this.parent) {
				throw new ReferenceError(`${name} is not defined`);
			}
			return this.parent.set(name, value);
		}
	}

	has(name) {
		if (this.content.has(name)) {
			return true;
		} else {
			if (!this.parent) {
				return false;
			}
			return this.parent.get(name);
		}
	}

	get(name) {
		if (this.content.has(name)) {
			const variable = this.content.get(name);
			if (variable.kind === 'const' && variable.init === false) {
				throw new ReferenceError(`Cannot access '${name}' before initialization`);
			}
			return variable.value;
		} else {
			if (!this.parent) {
				throw new ReferenceError(`${name} is not defined`)
			}
			return this.parent.get(name);
		}
	}

	clone() {
		const newScope = new Scope(this.kind, this.parent);
		newScope.content = new Map(this.content);
	}
}

module.exports = Scope;