# 作业 4 —— 为我们的解释器设计一个字节码虚拟机

## 作业要求：

### 虚拟机的基本结构

在我们第四讲已经大致讲了我们所设计虚拟机的基本结构，并且已经明确了我们重点关注的部分 —— 运算与逻辑，并且我们会简化数据结构如何存储的细节，而是用 JavaScript 原生的数据结构所代替。（比如我不能在这里让你们实现一个 gc 吧~

让我们回顾一下我们设计的虚拟机 （virtual-machine.js 文件）的基本结构，虚拟机上面有四个寄存器，两个通用寄存器，一个 PC 寄存器和一个栈指针寄存器。并且虚拟机上面有一个栈，用来保存函数的调用栈。

```TypeScript
class VirtualMachine {
	// 连个通用寄存器
	private r0: any = null;
	private r1: any = null;
  private r2: any = null;

	// pc 寄存器
	private pc: number = 0;
	// 栈顶指针
	private top: number = 0;

	// 调用栈
	private stack: StackFrame = [];
  
  // 代码
  private rom: Command[];

	// 复位，清空当前虚拟机所有状态
	private reset() {
		this.r0 = null;
		this.r1 = null;
    this.r2 = null;
		this.pc = 0;
		this.top = 0;
		this.stack = [bottom];
    this.rom = [];
	}

	// 执行一个指令
	private runCommand(command: Command) {
		// TODO: 这里是执行字节码的函数
	}

	// 执行
	public run(commands: Command[]) {
		// TODO: 循环执行指令
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
指令分成三个类型：
1. 转移/读取数据指令， move / load.
2. 运算指令，加减乘除一元二元等等都要实现, 如加减乘除... 等等。
3. 分支/跳转指令，branch / jump
4. 函数调用指令, call / return
4. 我们作用域特殊的指令，push / pop
4. 错误处理指令，try / throw



（注：下表中 [r]指寄存器名，[name] 指变量名，[literal] 指字面量 number / boolean / string / null / undefined / {} / []）

| 指令名     | 操作数                                 | 描述                                                         |
| ---------- | -------------------------------------- | ------------------------------------------------------------ |
| move       | 2, [r] [name] \| [name] [r] \| [r] [r] | 将变量名转移至寄存器，或者反过来。move #r0 a 指将 r0 的值转移至变量 a。 |
| get        | 3, [r] [r] [r]                         | 获取对象的属性，转移到第三个寄存器                           |
| set        | 3, [r] [r] [r]                         | 对象赋值                                                     |
| load       | 2, [r] [r] [literal]                   | 将字面量读取至寄存器。load #r0 123，值将 123 这个值 load 进 r0 寄存器中。 |
| var        | 1, [name]                              | 在作用域声明变量                                             |
| branch     | 1, [r]                                 | 根据寄存器中的数据跳转的指令。branch #r0，意思是如果 r0 寄存器的值是 true 则执行下一条指令，否则不执行下一条而继续执行下下条指令。 |
| jump       | 2, [lecture]                           | 根据寄存器中 r 的值调转到对应的指令进行执行。                |
| func       | 2, [lecture]                           | 创建函数对象，打入闭包                                       |
| call       | 2, [r] [r] [r]                         | 根据寄存器中 r 的位置进行跳转（调用函数），并且进行压栈。    |
| return     | 0                                      | 弹出栈，并且回到原来调用的位置。                             |
| push       | 0                                      | 创建一个新作用域                                             |
| pop        | 0                                      | 弹出作用域                                                   |
| try        | 1, [r]                                 | 创建一个作用域，并且记录报错以后跳转的位置。                 |
| throw      | 1, [r]                                 | 抛出错误                                                     |
| -          | 3, [r] [r] [r]                         | 将前两个寄存器的数据做操作，然后存入第三个寄存器             |
| +          | 3, [r] [r] [r]                         | 略                                                           |
| !          | 2, [r] [r]                             | 将前一个操作                                                 |
| ~          | 2, [r] [r]                             | 略                                                           |
| typeof     | 2, [r] [r]                             | 略                                                           |
| void       | 2, [r] [r]                             | 略                                                           |
| delete     | 2, [r] [r]                             | 略                                                           |
| ==         | 3, [r] [r] [r]                         | 略                                                           |
| !=         | 3, [r] [r] [r]                         | 略                                                           |
| ===        | 3, [r] [r] [r]                         | 略                                                           |
| !==        | 3, [r] [r] [r]                         | 略                                                           |
| <          | 3, [r] [r] [r]                         | 略                                                           |
| <=         | 3, [r] [r] [r]                         | 略                                                           |
| >          | 3, [r] [r] [r]                         | 略                                                           |
| >=         | 3, [r] [r] [r]                         | 略                                                           |
| <<         | 3, [r] [r] [r]                         | 略                                                           |
| >>         | 3, [r] [r] [r]                         | 略                                                           |
| >>>        | 3, [r] [r] [r]                         | 略                                                           |
| +          | 3, [r] [r] [r]                         | 略                                                           |
| -          | 3, [r] [r] [r]                         | 略                                                           |
| *          | 3, [r] [r] [r]                         | 略                                                           |
| /          | 3, [r] [r] [r]                         | 略                                                           |
| %          | 3, [r] [r] [r]                         | 略                                                           |
| ^          | 3, [r] [r] [r]                         | 略                                                           |
| &          | 3, [r] [r] [r]                         | 略                                                           |
| instanceof | 3, [r] [r] [r]                         | 略                                                           |
| \|\|       | 3, [r] [r] [r]                         | 略                                                           |
| &&         | 3, [r] [r] [r]                         | 略                                                           |
| new        | 2, [r] [r]                             | 根据为构造器的地址创建一个对象，参考 call                    |
| halt       | 0                                      | 停机指令，标志程序终止                                       |

