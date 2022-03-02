# js-interpreter

## 语法树 AST

> 在生成语法树前，需要先进行分词 `Token`

通过模块`acorn`将`JS`代码解析为`AST`树。

如将代码段解析为如下结构：

```js
let a = 1;
```

```json
{
  "type": "Program",
  "start": 0,
  "end": 10,
  "body": [
    {
      "type": "VariableDeclaration",
      "start": 0,
      "end": 10,
      "declarations": [
        {
          "type": "VariableDeclarator",
          "start": 4,
          "end": 9,
          "id": {
            "type": "Identifier",
            "start": 4,
            "end": 5,
            "name": "a"
          },
          "init": {
            "type": "Literal",
            "start": 8,
            "end": 9,
            "value": 1,
            "raw": "1"
          }
        }
      ],
      "kind": "let"
    }
  ],
  "sourceType": "module"
}
```

## 作用域 Scope

> 在每一个新的块中需要创建新的作用域

`JS`中作用域主要分为三个部分：

- 全局作用域
- 函数作用域
- 块作用域

本解释器中，作用域中存储相关的变量信息，包含`declare`，`get`，`set`三个部分。

针对`var` `const` `let`三类变量进行存储，各自具备各自的声明与使用特点。

### var

- 允许重复声明
- 声明提前至**函数作用域**或**全局作用域**
- **全局作用域**下变量直接赋值，则当作`var`处理

### const

- 不允许重复声明
- 不允许重新赋值
- 不能声明提前

### let

- 不允许重复声明
- 不能声明提前

## 函数 Function

本解释器中处理以下几类函数：

- 普通函数 `function() {}`
- 箭头函数 `() => {}`
- 异步函数 `async function() {}`
- 生成器函数 `funtion* (){}`

对于函数的处理，需创建新的函数返回，在新的函数中对原函数进行调用。

额外注意:

- 参数的处理，创建新的作用域，当前作用域
- `return`的处理，在递归中将`return`返回
- 箭头函数的返回方式有两种

## 异步 Async

异步函数将基于 `Generator` 来实现，处理`async`和`await`字段。

通过`asyncToGenerator`函数来同步执行异步函数，见`lib.js`。

## 生成器 Generator

生成器的实现直接借用 API 来完成，处理`yield`和`function *{}`。

### yield

生成器的特点在于**中断**和**恢复**，即中断当前执行环境，恢复上一次的执行环境。

> 正因此，`yield`不能像`return`一样前提，需要将递归函数同样封装为 `generator`

`gen.next()`返回值为如下对象：

```js
{
  value: "xx",
  done: false // true
}
```
