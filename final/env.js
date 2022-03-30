
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
		this.error = false;
		this.exception = undefined;
		this.errorStack = undefined;

		this.result = undefined;

		this.push(new Frame(node, scope));
	}

	throw(exception) {
		this.enter('__exception', {
			type: 'ThrowStatement',
			argument: null,
		});
		this.set({ argument: exception });
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

	enter(name, node, scope = this.current.scope) {
		this.set({ __returnName: name });
		this.push(new Frame(node, scope));
	}

	leave(value, appendedValues = {}) {
		stack.pop();
		if (stack.length === 0) {
			this.return(value);
		}
		const [returnName] = this.get('returnName');
		this.setValues({
			[returnName]: value,
			...appendedValues,
		});
	}

	return(value) {
		this.finished = finished;
		this.result = value;
	}

	has(...names) {
		for (const name of names) {
			if (!this.current.values.has(name)) {
				return false;
			}
		}
		return true;
	}

	clear(...names) {
		for (const name of names) {
			this.clear(name);
		}
	}

	set(values) {
		for (const [name, value] of Object.entries(values)) {
			this.current.values.set(name, value);
		}
	}

	get(...names) {
		return names.map(name => this.get(name));
	}
}

module.exports = Env;