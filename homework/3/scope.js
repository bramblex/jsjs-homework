class Scope {
  constructor(type, parent) {
    this.variables = {};
    this.type = type;
    this.parent = parent;
  }

  declare(kind, name) {
    if (kind === 'var') {
      let variables = this.variables;
      let parent = this.parent;
      let type = this.type;
      while (parent && type === 'block') {
        variables = parent.variables;
        type = parent.type;
        parent = parent.parent;
      }
      variables[name] = { kind, value: undefined };
    } else {
      if (name in this.variables) return this.throwError('Depulicate definition');
      this.variables[name] = { kind, value: undefined };
    }
  }

  get(name) {
    if (name in this.variables) return this.variables[name].value;
    let parent = this.parent;
    let variables = parent.variables;
    while (parent && variables) {
      if (name in variables) return variables[name].value;
      parent = parent.parent;
      if (parent) variables = parent.variables;
    }
    return this.throwError('No definition');
  }

  set(name, value) {
    const param = this.variables[name];
    if (name in this.variables) {
      if (this.variables[name].kind === 'const' && param && typeof(param.value) === 'number') return this.throwError('Assignment to constant variable');
      return this.variables[name].value = value;
    }
    let parent = this.parent;
    let variables = parent.variables;
    while (parent && variables) {
      if (name in variables) {
        if (variables[name].kind === 'const' && variables[name] && typeof(variables[name].value) === 'number') return this.throwError('Assignment to constant variable');
        return variables[name].value = value;
      }
      parent = parent.parent;
      variables = parent.variables;
    }
    return this.throwError('No defination');
  }

  throwError(msg) {
    throw new Error(msg);
  }
}

module.exports = Scope;