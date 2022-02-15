/**
 * class Scope
 * 作用域，包含作用域的类型与作用域中的变量
 */
module.exports = class Scope {
  constructor(type = "Global", parent = null) {
    this.variables = {};
    this.type = type;
    this.parent = parent;
  }

  declare(type, name, global = false) {
    let temp = {
      type: type,
      value: undefined,
    };

    if (name in this.variables) {
      if (this.variables[name].type !== "var" || type !== "var")
        throw new SyntaxError(`Identifier '${name}' has already been declared`);
    }

    if (global) {
      if (this.parent) this.parent.declare(type, name);
      else this.variables[name] = temp;
    } else if (type === "var") {
      if (!this.parent || this.type === "Function") {
        this.variables[name] = temp;
      } else if (!global) {
        this.parent.declare(type, name);
      }
    } else {
      this.variables[name] = temp;
    }
  }

  has(name) {
    if (name in this.variables) {
      return true;
    } else {
      if (this.parent) return this.parent.has(name);
      else return false;
    }
  }

  get(name) {
    if (name in this.variables) {
      return this.variables[name].value;
    } else {
      if (this.parent) {
        return this.parent.get(name);
      } else {
        throw new ReferenceError(
          `Uncaught ReferenceError: '${name}' is not defined`
        );
      }
    }
  }

  set(name, value) {
    if (name in this.variables) {
      let variable = this.variables[name];
      if (variable.type === "const" && variable.value !== undefined) {
        throw new TypeError("Assignment to constant variable");
      }
      variable.value = value;
    } else {
      if (this.parent) {
        this.parent.set(name, value);
      }
    }
  }
};
