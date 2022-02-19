/**
 * class Scope
 * 作用域，包含作用域的类型与作用域中的变量
 * Global：全局作用域
 * Block：块作用域
 * Function：函数作用域
 */
module.exports = class Scope {
  constructor(type = "Global", parent = null) {
    this.variables = {};
    if (["Global", "Function", "Block"].includes(type)) this.type = type;
    // else throw new Error(`undefined type '${type}' for scope.`);
    this.parent = parent;
  }

  /**
   * @param {String} type
   * @param {String} name
   * @param {Boolean} global  if defined in global
   * @returns
   */
  declare(type, name, global = false) {
    let temp = {
      type: type,
      value: undefined,
    };

    if (name in this.variables) {
      // redeclare only for var-var
      if (this.variables[name].type !== "var" || type !== "var")
        throw new SyntaxError(`Identifier '${name}' has already been declared`);
      // global context can't be rewritten
      if (name === "global" && type === "var") return;
    }

    if (global) {
      // defined in global
      if (this.parent) this.parent.declare(type, name);
      else this.variables[name] = temp;
    } else if (type === "var") {
      // defined in global or function
      if (!this.parent || this.type === "Function") {
        this.variables[name] = temp;
      } else {
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
      // const can't be rewritten
      if (variable.type === "const" && variable.value !== undefined) {
        throw new TypeError("Assignment to constant variable");
      }
      // global context can't be rewritten
      if (name === "global" && variable.value !== undefined) return;
      variable.value = value;
    } else {
      if (this.parent) {
        this.parent.set(name, value);
      }
    }
  }
};
