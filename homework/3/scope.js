/**
 * class Scope
 * 作用域，包含作用域的类型与作用域中的变量
 */
module.exports = class Scope {
  constructor(type, parent = null) {
    this.variables = {};
    this.type = type;
    this.parent = parent;
  }

  declare(type, name) {
    let temp = {
      type: type,
      value: undefined,
    };
    if (type === "var") {
      if (!this.parent) {
        this.variables[name] = temp;
      } else {
        this.parent.declare(type, name);
      }
    } else {
      this.variables[name] = temp;
    }
  }

  get(name) {
    if (name in this.variables) {
      return this.variables[name].value;
    } else {
      if (this.parent) {
        return this.parent.get(name);
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
