class InterruptBlock {
  constructor(type, value) {
    this.type = type;
    this.value = value; // for return
  }

  static isReturn(node) {
    return node instanceof InterruptBlock && node.type === "return";
  }

  static isContinue(node) {
    return node instanceof InterruptBlock && node.type === "continue";
  }

  static isBreak(node) {
    return node instanceof InterruptBlock && node.type === "break";
  }
}

module.exports = InterruptBlock;
