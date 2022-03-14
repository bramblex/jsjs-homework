class Value {
  constructor(kind, value) {
    this.kind = kind;
    this.value = value;
  }

  get() {
    return this.value;
  }

  set(value) {
    if (this.kind === "const") {
      throw new TypeError("Assignment to constant variable");
    }

    this.value = value;
  }
}

class Scope {
  constructor(type, parent) {
    this.variables = {}; // name (string): Value
    this.type = type; // function / block
    this.parent = parent;
    this.label = undefined;
  }

  declare(kind, name, initVal) {
    // kind: var / const / let
    if (kind === "var") {
      // scope提升到function顶部
      let scope = this;
      while (scope.type !== "Function" && scope.parent) {
        scope = scope.parent;
      }
      scope.variables[name] = new Value("var", initVal);
    } else if (kind === "let") {
      if (this.variables[name]) {
        throw new SyntaxError(`Identifier ${name} has already been declared`);
      }
      this.variables[name] = new Value("let", initVal);
    } else if (kind === "const") {
      if (this.variables[name]) {
        throw new SyntaxError(`Identifier ${name} has already been declared`);
      }
      this.variables[name] = new Value("const", initVal);
    } else {
      throw new SyntaxError("Unexpected identifier");
    }
  }

  get(name) {
    if (this.variables[name]) {
      return this.variables[name].get();
    } else if (this.parent) {
      return this.parent.get(name);
    } else if (globalThis[name]) {
      return globalThis[name];
    }
    throw new ReferenceError(`${name} is not defined`);
  }

  set(name, value) {
    if (this.variables[name]) {
      return this.variables[name].set(value);
    } else if (this.parent) {
      return this.parent.set(name, value);
    }
  }
}

module.exports = Scope;
