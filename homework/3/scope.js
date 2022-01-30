function ref(value, kind) {
  return { value, kind };
}

class Scope {
  constructor(type, parent) {
    this.ctx = new Map();
    this.type = type;
    this.parent = parent || null;
  }

  declare(kind, name, value) {
    switch (kind) {
      case "var": {
        this._var(name, value);
        break;
      }

      case "let": {
        this._let(name, value);
        break;
      }

      case "const": {
        this._const(name, value);
        break;
      }

      default:
        break;
    }
  }

  set(name, value) {
    if (this.get(name).kind === "const") {
      throw new TypeError('Assignment to constant variable')
    } else {
      this.get(name).value = value;
    }
  }

  get(name) {
    if (this.ctx.has(name)) {
      return this.ctx.get(name);
    } else if (this.parent) {
      return this.parent.get(name);
    } else {
      throw new ReferenceError(`${name} is not defined`);
    }
  }

  _var(name, value) {
    this._check(name);
    this.ctx.set(name, ref(value, "var"));
  }

  _let(name, value) {
    this._check(name);
    this.ctx.set(name, ref(value, "let"));
  }

  _const(name, value) {
    this._check(name);
    this.ctx.set(name, ref(value, "const"));
  }

  _check(name) {
    if (this.ctx.has(name) && this.ctx.get(name).kind !== "var") {
      throw new SyntaxError(`${name} has already been declared`);
    }
  }
}

module.exports = Scope;