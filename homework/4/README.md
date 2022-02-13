# 作业 4* —— 为我们的解释器设计一个字节码虚拟机

> 注：这个作业是一个选做作业，不做硬性要求，有兴趣的同学可以尝试一下~

## 作业要求：

1. 根据下列要求实现一个简易的字节码虚拟机
2. 为下面字节码虚拟机实现一个编译器，将 JavaScript 代码编译成这个虚拟机的指令数组
3. 设计一个二进制的格式，可以将指令数组序列化成二进制文件，并且可以反序列化成指令数组



## 思考：

1. 将 JavaScript 代码编译指令数组时：
   1. 如何将一个很长的表达式拆成一步一步执行？表达式产生的中间变量该怎么处理？
   2. 如何编译控制流？是否所有的控制流语句（分支，循环）都可以用用 `branch` 和 `jump` 实现？
   3. 函数是什么？一个函数包含哪些东西？函数调用和返回过程是怎么样的？
2. 当编译 try / catch 的时：
   1. try / catch / finally 的语义是什么？
   2. 当 try / catch / finally 嵌套的时候是怎么样的？
   3. 当函数在 try / catch 内 return 的时候会发生什么？



## 虚拟机结构

### 基本结构

在我们第四讲已经大致讲了我们所设计虚拟机的基本结构，并且已经明确了我们重点关注的部分 —— 运算与逻辑，并且我们会简化数据结构如何存储的细节，而是用 JavaScript 原生的数据结构所代替。（比如我不能在这里让大家实现一个 gc 吧~

让我们回顾一下我们设计的虚拟机 （virtual-machine.js 文件）的基本结构，虚拟机上面有5个通用寄存器，一个 PC 寄存器，一个 ret 寄存器和一个 err 寄存器。并且虚拟机上面有一个栈，用来保存函数的调用栈。

```TypeScript
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
    
    // ret 寄存器，标记当前当前函数状态，用于处理函数 return 与 fanlly 问题
    this.ret = 0;
    this.err = null; // 错误寄存器

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
```


### 我们调用栈的结构
栈的作用我们在课上已经讲过了 —— 保持入口环境。我们一起回顾一下我们代码执行有哪些上下文环境？

1. PC —— 要记录我们的代码原来执行到哪里了
2. scope —— 要记录我们代码里面当前位置能访问到的变量，这个 Scope 就是作业 3 中实现的 Scope 类

```TypeScript
// 栈帧
interface StackFrame {
	pc: number;
	scopes: Scope[]; // 所谓的作用域链
}
```

### 指令设计
指令分成一下几类：
1. 转移/读取数据指令
2. 运算指令，加减乘除一元二元等等都要实现, 如加减乘除... 等等。
3. 分支/跳转指令
4. 函数调用指令
4. 我们作用域特殊的指令
4. 错误处理指令



（注：下表中 [r]指寄存器名，[name] 指变量名，[literal] 指字面量 number / boolean / string / null / undefined / {} / []）

| 指令名     | 操作数             | 描述                                                         |
| ---------- | ------------------ | ------------------------------------------------------------ |
| load       | 2, [r] [name]      | 例：`load r0 hello`，将当前作用域 `hello`变量的值读进寄存器 `r0` |
| loadi      | 2, [r] [literal]   | 例：`loadi r0 123`，将值 123 读进 `r0` 寄存器                |
| out        | 3, [r] [name]      | 例：`out r0 hello`，将 `r0` 的值写入向前作用域 `hello` 变量  |
| move       | 2, [r] [r]         | 例：`move r0 r1` ，将 `r0` 寄存器内的值转移到 `r1` 寄存器    |
| get        | 2, [r] [r]         | 例：`get r0 r1` ，以 `r1` 为键值取 `r0` 对象的属性，并且将结果保存到 `r0`寄存器 |
| set        | 3, [r] [r] [r]     | 例：`set r0 r1 r2`，以 `r1` 为键值给 `r0` 对象的属性赋值为 `r2` 的值 |
| var        | 1, [name]          | 例：`var hello`，在当前函数域声明变量 `hello`                |
| const      | 1, [name]          | 例：`const hello`， 在当前块作用域声明静态变量 `hello`       |
| let        | 1, [name]          | 例：`let hello`， 在当前块作用域声明可变变量 `let`           |
| branch     | 1, [r]             | 例：`branch r0`，如果 `r0` 为 `true`则执行下一条指令，否则执行下下条指令（PC += 1），往往和 `jump` 指令配合使用 |
| jump       | 1, [label]         | 例：`jump loop`，跳转到 `loop` 标记的行指令开始执行（PC = 123） |
| func       | 2, [label] [r]     | 例：`func funA r0`，创建函数对象并打入当前闭包，函数的入口位置为 `funcA `行，并将函数对象存入 `r0` 寄存器 |
| call       | 1, [r]             | 例：`call r0 `，调用 `r0` 函数，并压入函数栈                 |
| return     | 0                  | 例：`return`，函数返回出栈                                   |
| try        | 2, [label] [label] | 例：`try catchA finallyA`，在当前块中如果出现错误，则跳转到 `catchA`行继续执行代码，无论是否出错，最后都会跳转到 `finallyA` 行执行。与 `ret` 寄存器配合实现 `return` 前执行 `finally`的代码。 |
| throw      | 1, [r]             | 例：`throw r0`  ，以 `r0`内的值抛出错误                      |
| bpush      | 0                  | 例：`scope`，创建一个块作用域                                |
| fpush      | 0                  | 例：`fscope`， 创建一个函数作用域                            |
| spop       | 0                  | 例：`spop`，弹出作用域                                       |
| new        | 1, [r]             | 例：`new r0`，以 `r0` 寄存器的函数对象为构造函数创建对象。   |
| halt       | 0                  | 例：`halt`，挂起指令，标志当前任务挂起。                     |
| !          | 1, [r]             | 例：`! r0`，取 `r0` 的反，结果储存在 `r0`（所有运算结果全部都同意存储在 `r0`寄存器，下面所有医院元操作全部相同) |
| ~          | 1, [r]             | 略                                                           |
| typeof     | 1, [r]             | 略                                                           |
| void       | 1, [r]             | 略                                                           |
| -          | 2, [r] [r]         | 例：`- r0 r1`，将  `r0` 与 `r1` 相减，结果储存在 `r0`（所有运算结果全部都同意存储在 `r0`寄存器，下面所有二元操作全部相同) |
| +          | 2, [r] [r]         | 略                                                           |
| delete     | 2, [r] [r]         | 略                                                           |
| ==         | 2, [r] [r]         | 略                                                           |
| !=         | 2, [r] [r]         | 略                                                           |
| ===        | 2, [r] [r]         | 略                                                           |
| !==        | 2, [r] [r]         | 略                                                           |
| <          | 2, [r] [r]         | 略                                                           |
| <=         | 2, [r] [r]         | 略                                                           |
| >          | 2, [r] [r]         | 略                                                           |
| >=         | 2, [r] [r]         | 略                                                           |
| <<         | 2, [r] [r]         | 略                                                           |
| >>         | 2, [r] [r]         | 略                                                           |
| >>>        | 2, [r] [r]         | 略                                                           |
| +          | 2, [r] [r]         | 略                                                           |
| -          | 2, [r] [r]         | 略                                                           |
| *          | 2, [r] [r]         | 略                                                           |
| /          | 2, [r] [r]         | 略                                                           |
| %          | 2, [r] [r]         | 略                                                           |
| ^          | 2, [r] [r]         | 略                                                           |
| &          | 2, [r] [r]         | 略                                                           |
| instanceof | 2, [r] [r]         | 略                                                           |
| \|\|       | 2, [r] [r]         | 略                                                           |
| &&         | 2, [r] [r]         | 略                                                           |
