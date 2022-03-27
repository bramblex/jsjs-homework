
class Frame {
	constructor(node, scope) {
		this.node = node;
		this.scope = scope;
		this.values = new Map();
	}
}

class Env {
	constructor(node, scope) {
		this.stack = [];
		this.current = undefined;

		this.finished = false;
		this.result = undefined;

		this.push(new Frame(node, scope));
	}

	throw(exception) {
		this.error = true;
		this.exception = exception;
	}

	push(frame) {
		this.stack.push(frame);
		this.current = frame;
	}

	pop() {
		const frame = this.stack.pop();
		this.current = this.stack[this.stack.length - 1];
		return frame;
	}

	next(name, node, scope = this.current.scope) {
		this.setValue('__returnName', name);
		this.push(new Frame(node, scope));
	}

	return(value, appends = {}) {
		stack.pop();
		if (stack.length === 0) {
			this.finished = true;
			this.result = value;
		}
		this.setValue(this.getValue('__returnName'), value)
		this.setValue(appends);
	}

	hasValue(name) {
		this.current.values.has(name);
	}

	setValue(name, value) {
		this.current.values.set(name, value);
	}

	setValues(values) {
		for (const [name, value] of Object.entries(values)) {
			this.current.values.set(name, value);
		}
	}

	getValue(name) {
		return this.current.values.get(name);
	}

	getValues(names) {
		return names.map(name => this.getValue(name));
	}
}

module.exports = Env;