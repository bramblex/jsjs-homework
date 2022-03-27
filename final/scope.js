
class Scope {
	constructor(type, parent = null) { // global, function, block
		this.type = type;
		this.parent = parent;
		this.content = new Map();
	}

	declare(kind, name) {
		const variable = { kind, init: false, value: undefined };
		if (kind === 'var') {
			if (this.type !== 'block') {
				return this.parent.declare(kind, name);
			}
			if (!this.content.has(name)) {
				this.content.set(name, variable);
			}
		} else {
			if (this.content.has(name)) {
				throw new SyntaxError(`Identifier '${name}' has already been declared`);
			}
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
}

module.exports = Scope;