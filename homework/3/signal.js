class Signal {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }

  static _check(v, t) {
    return v instanceof Signal && v.type === t;
  }

  static isContinue(v) {
    return this._check(v, "continue");
  }

  static isBreak(v) {
    return this._check(v, "break");
  }

  static isReturn(v) {
    return this._check(v, "return");
  }
}

module.exports = Signal;