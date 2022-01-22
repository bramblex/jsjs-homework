class EnvironmentRecord {
  /**
   * @param {EnvironmentRecord | null} outer
   * @param {'function' | 'block' | 'global'} type
   */
  constructor(outer, type = "block") {
    this.type = type;
    this.outer = outer || null;
    /**
     * @type {{ type: 'const' | 'let' | 'var', value: any }}
     */
    this.binding = {};
  }

  /**
   * @param {string} name
   * @param {'let' | 'const' | 'var'} type
   */
  declare(name, type, value) {
    if (type === 'var') {
      let env = this;
      while (env) {
        if (env.type !== 'block') {
          return env.binding[name] = {
            type,
            value: value,
          };
        } else {
          env = env.outer;
        }
      }
    }

    this.binding[name] = {
      type,
      value: value,
    };
  }

  /**
   * @param {string} name
   */
  get(name) {
    let env = this;
    while (env) {
      if (env.binding.hasOwnProperty(name)) {
        return env.binding[name].value;
      } else {
        env = env.outer;
      }
    }

    return undefined;
  }

  /**
   * @param {string} name
   * @param {any} value
   */
  set(name, value) {
    let env = this;
    while (env) {
      if (env.binding.hasOwnProperty(name)) {
        if (env.binding[name].type === "const") {
          throw new TypeError("Assignment to constant variable.")
          // return {
          //   type: "throw",
          //   value: new TypeError("Assignment to constant variable."),
          // };
        }
        return (env.binding[name].value = value);
      } else {
        env = env.outer;
      }
    }
    return undefined;
  }

  /**
   * @param {string} name
   */
  delete(name) {
    delete this.binding[name];
  }
}

module.exports = EnvironmentRecord;
