
// 作用域
class Scope {
  constructor(parent) {
    this.parent = parent;
    this.content = new Set();
  }

  get(name) {
    if (this.content.has(name)) {
      return this.content.get(name)
    }
    return this.parent?.get(name)
  }

  var(name) {
    this.content.set(name, undefined)
  }

  set(name, value) {
    if (this.content.has(name)) {
      return this.content.set(name, value)
    }
    return this.parent?.set(name, value)
  }
}

class StackFrame {
  constructor(pc, closure) {
    this.pc = pc
    this.scope = new Scope(closure)
  }
}

class VirtualMachine {
  constructor() {
    this._id = 0;
    this.reset()
  }

  runCommand([cmd, ...operand]) {
    // @TODO: 这里补全虚拟机代码
  }

  reset() {
    // 代码保存在这里
    this.rom = [];

    // 通用寄存器
    this.r0 = null;
    this.r1 = null;
    this.r2 = null;

    // pc寄存器
    this.pc = 0;

    // 调用栈
    this.stack = [new StackFrame(0, null)];
  }

  setRom(rom) {
    this.rom = rom
  }

  step() {
    const command = this.rom[this.pc]
    this.pc++
    this.runCommand(command)
  }

  run() {
    while (this.pc < this.rom.length) {
      this.step()
    }
  }
}