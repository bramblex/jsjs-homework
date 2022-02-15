
// 作用域
class Scope {
  // @TODO: 补全
}

class Stack {
  // @TODO: 补全
}

class CallStackFrame {
  // @TODO: 补全
}

class VirtualMachine {
  constructor() {
  }

  runCommand([cmd, op0, op1, op2, op3, op4]) {
    switch (cmd.toLowerCase()) {
      // @TODO: 补全
      case "var": { this.callStack.top().scope.var(a); break; }
    }
  }

  reset() {
    // 代码保存在这里
    this.rom = [];

    // 通用寄存器
    this.r0 = null;
    this.r1 = null;
    this.r2 = null;
    this.r3 = null;
    this.r4 = null;

    // pc寄存器
    this.pc = 0;

    // 调用栈
    this.callStack = new Stack();
    this.callStack.push(new CallStackFrame(0, null))
  }

  step() {
    const command = this.rom[this.pc]
    this.pc++
    this.runCommand(command)
  }

  run(rom) {
    this.reset()
    this.rom = rom
    while (this.pc < this.rom.length) {
      this.step()
    }
  }
}