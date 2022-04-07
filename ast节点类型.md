### AST 节点介绍

[详细地址1](http://123.57.44.123/javascript/%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91%E5%88%9D%E8%AF%86/)

[详细地址2](https://memoryoflove.github.io/javascript/%E6%8A%BD%E8%B1%A1%E8%AF%AD%E6%B3%95%E6%A0%91%E5%88%9D%E8%AF%86/)

#### Identifier

标识符，就是我们写 JS 时自定义的名称，如变量名，函数名，属性名，都归为标识符。相应的接口是这样的：

```
interface Identifier <: Expression, Pattern {
    type: "Identifier";
    name: string;
}
```



一个标识符可能是一个表达式，或者是解构的模式（ES6 中的解构语法）。我们等会会看到 `Expression` 和 `Pattern` 相关的内容的。

#### Literal

字面量，这里不是指 `[]` 或者 `{}` 这些，而是本身语义就代表了一个值的字面量，如 `1`，`“hello”`, `true` 这些，还有正则表达式（有一个扩展的 Node 来表示正则表达式），如 `/\d?/`。我们看一下文档的定义：

```
interface Literal <: Expression {
    type: "Literal";
    value: string | boolean | null | number | RegExp;
}
```



这里即对应了字面量的值，我们可以看出字面量值的类型，字符串，布尔，数值，null 和正则。

#### RegExpLiteral

这个针对正则字面量的，为了更好地来解析正则表达式的内容，添加多一个 `regex` 字段，里边会包括正则本身，以及正则的 `flags`。

```
interface RegExpLiteral <: Literal {
  regex: {
    pattern: string;
    flags: string;
  };
}
```



#### Programs

一般这个是作为跟节点的，即代表了一棵完整的程序代码树。

```
interface Program <: Node {
    type: "Program";
    body: [ Statement ];
}
```



`body` 属性是一个数组，包含了多个 `Statement`（即语句）节点。

#### Functions

函数声明或者函数表达式节点。

```
interface Function <: Node {
    id: Identifier | null;
    params: [ Pattern ];
    body: BlockStatement;
}
```



`id` 是函数名，`params` 属性是一个数组，表示函数的参数。`body` 是一个块语句。
有一个值得留意的点是，你在测试过程中，是不会找到 `type: "Function"` 的节点的，但是你可以找到 `type: "FunctionDeclaration"` 和 `type: "FunctionExpression"`，因为函数要么以声明语句出现，要么以函数表达式出现，都是节点类型的组合类型，后边会再提及 `FunctionDeclaration` 和 `FunctionExpression` 的相关内容。
这让人感觉这个文档规划得蛮细致的，函数名，参数和函数块是属于函数部分的内容，而声明或者表达式则有它自己需要的东西。

#### Statement

语句节点没什么特别的，它只是一个节点，一种区分，但是语句有很多种，下边会详述。

```
interface Statement <: Node { }ExpressionStatement
```



#### ExpressionStatement

表达式语句节点，`a = a + 1` 或者 `a++` 里边会有一个 `expression` 属性指向一个表达式节点对象（后边会提及表达式）。

```
interface ExpressionStatement <: Statement {    type: "ExpressionStatement";    expression: Expression;}
```



#### BlockStatement

块语句节点，举个例子：`if (...) { // 这里是块语句的内容 }`，块里边可以包含多个其他的语句，所以有一个 `body` 属性，是一个数组，表示了块里边的多个语句。

```
interface BlockStatement <: Statement {    type: "BlockStatement";    body: [ Statement ];}
```



#### EmptyStatement

一个空的语句节点，没有执行任何有用的代码，例如一个单独的分号 ;

```
interface EmptyStatement <: Statement {    type: "EmptyStatement";}
```



#### DebuggerStatement

`debugger`，就是表示这个，没有其他了。

```
interface DebuggerStatement <: Statement {    type: "DebuggerStatement";}
```



#### WithStatement

`with` 语句节点，里边有两个特别的属性，`object` 表示 `with` 要使用的那个对象（可以是一个表达式），`body` 则是对应 `with` 后边要执行的语句，一般会是一个块语句。

```
interface WithStatement <: Statement {    type: "WithStatement";    object: Expression;    body: Statement;}
```



下边是控制流的语句：

#### ReturnStatement

返回语句节点，`argument` 属性是一个表达式，代表返回的内容。

```
interface ReturnStatement <: Statement {    type: "ReturnStatement";    argument: Expression | null;}
```



#### LabeledStatement

`label` 语句，平时可能会比较少接触到，举个例子：

```
loop: for(let i = 0; i < len; i++) {
    // ...
    for (let j = 0; j < min; j++) {
        // ...
        break loop;
    }
}
```



这里的 `loop` 就是一个 `label` 了，我们可以在循环嵌套中使用 `break loop` 来指定跳出哪个循环。所以这里的 `label` 语句指的就是 `loop: ...` 这个。
一个 `label` 语句节点会有两个属性，一个 `label` 属性表示 `label` 的名称，另外一个 `body` 属性指向对应的语句，通常是一个循环语句或者 `switch` 语句。

```
interface LabeledStatement <: Statement {    type: "LabeledStatement";    label: Identifier;    body: Statement;}
```



#### BreakStatement

`break` 语句节点，会有一个 `label` 属性表示需要的 `label` 名称，当不需要 `label` 的时候（通常都不需要），便是 `null`。

```
interface BreakStatement <: Statement {    type: "BreakStatement";    label: Identifier | null;}
```



#### ContinueStatement

`continue` 语句节点，和 `break` 类似。

```
interface ContinueStatement <: Statement {
    type: "ContinueStatement";
    label: Identifier | null;
}
```



下边是条件语句：

#### IfStatement

`if` 语句节点，很常见，会带有三个属性，test 属性表示 `if (...)` 括号中的表达式。
`consequent` 属性是表示条件为 `true` 时的执行语句，通常会是一个块语句。
`alternate` 属性则是用来表示 `else` 后跟随的语句节点，通常也会是块语句，但也可以又是一个 `if` 语句节点，即类似这样的结构：`if (a) { //... } else if (b) { // ... }`。`alternate` 当然也可以为 `null`。

```
interface IfStatement <: Statement {    type: "IfStatement";    test: Expression;    consequent: Statement;    alternate: Statement | null;}
```



#### SwitchStatement

`switch` 语句节点，有两个属性，`discriminant`属性表示 `switch` 语句后紧随的表达式，通常会是一个变量，`cases` 属性是一个 `case` 节点的数组，用来表示各个 `case` 语句。

```
interface SwitchStatement <: Statement {    type: "SwitchStatement";    discriminant: Expression;    cases: [ SwitchCase ];}
```



#### SwitchCase

`switch` 的 `case` 节点。`test` 属性代表这个 `case` 的判断表达式，`consequent` 则是这个 `case` 的执行语句。
当 `test` 属性是 `null` 时，则是表示 `default` 这个 `case` 节点。

```
interface SwitchCase <: Node {
    type: "SwitchCase";
    test: Expression | null;
    consequent: [ Statement ];
}
```



下边是异常相关的语句：

#### ThrowStatement

`throw` 语句节点，`argument` 属性用以表示 `throw` 后边紧跟的表达式。

```
interface ThrowStatement <: Statement {    type: "ThrowStatement";    argument: Expression;}
```



#### TryStatement

`try` 语句节点，`block` 属性表示 `try` 的执行语句，通常是一个块语句。
`hanlder` 属性是指 `catch` 节点，`finalizer` 是指 `finally` 语句节点，当 `hanlder` 为 `null` 时，`finalizer` 必须是一个块语句节点。

```
interface TryStatement <: Statement {    type: "TryStatement";    block: BlockStatement;    handler: CatchClause | null;    finalizer: BlockStatement | null;}
```



#### CatchClause

`catch` 节点，`param` 用以表示 `catch` 后的参数，`body` 则表示 `catch` 后的执行语句，通常是一个块语句。

```
interface CatchClause <: Node {    type: "CatchClause";    param: Pattern;    body: BlockStatement;}
```



下边是循环语句：

#### WhileStatement

`while` 语句节点，`test` 表示括号中的表达式，`body` 是表示要循环执行的语句。

```
interface WhileStatement <: Statement {
    type: "WhileStatement";
    test: Expression;
    body: Statement;
}
```



#### DoWhileStatement

`do/while` 语句节点，和 `while` 语句类似。

```
interface DoWhileStatement <: Statement {    type: "DoWhileStatement";    body: Statement;    test: Expression;}
```



#### ForStatement

`for` 循环语句节点，属性 `init/test/update` 分别表示了 `for` 语句括号中的三个表达式，初始化值，循环判断条件，每次循环执行的变量更新语句（`init` 可以是变量声明或者表达式）。这三个属性都可以为 `null`，即 `for(;;){}`。`body` 属性用以表示要循环执行的语句。

```
interface ForStatement <: Statement {
    type: "ForStatement";
    init: VariableDeclaration | Expression | null;
    test: Expression | null;
    update: Expression | null;
    body: Statement;
}
```



#### ForInStatement

`for/in` 语句节点，`left` 和 `right` 属性分别表示在 `in` 关键词左右的语句（左侧可以是一个变量声明或者表达式）。`body` 依旧是表示要循环执行的语句。

```
interface ForInStatement <: Statement {
    type: "ForInStatement";
    left: VariableDeclaration |  Pattern;
    right: Expression;
    body: Statement;
}
```



#### Declarations

声明语句节点，同样也是语句，只是一个类型的细化。下边会介绍各种声明语句类型。

```
interface Declaration <: Statement { }
```



#### FunctionDeclaration

函数声明，和之前提到的 `Function` 不同的是，`id` 不能为 `null`。

```
interface FunctionDeclaration <: Function, Declaration {
    type: "FunctionDeclaration";
    id: Identifier;
}
```



#### VariableDeclaration

变量声明，`kind` 属性表示是什么类型的声明，因为 ES6 引入了 `const/let`。`declarations`表示声明的多个描述，因为我们可以这样：`let a = 1, b = 2;`。

```
interface VariableDeclaration <: Declaration {
    type: "VariableDeclaration";
    declarations: [ VariableDeclarator ];
    kind: "var";
}
```



#### VariableDeclarator

变量声明的描述，`id` 表示变量名称节点，`init` 表示初始值的表达式，可以为 `null`。

```
interface VariableDeclarator <: Node {
    type: "VariableDeclarator";
    id: Pattern;
    init: Expression | null;
}
```



#### Expressions

表达式节点。

```
interface Expression <: Node { }
```



#### ThisExpression

表示 `this`。

```
interface ThisExpression <: Expression {
    type: "ThisExpression";
}
```



#### ArrayExpression

数组表达式节点，`elements` 属性是一个数组，表示数组的多个元素，每一个元素都是一个表达式节点。

```
interface ArrayExpression <: Expression {
    type: "ArrayExpression";
    elements: [ Expression | null ];
}
```



#### ObjectExpression

对象表达式节点，`property` 属性是一个数组，表示对象的每一个键值对，每一个元素都是一个属性节点。

```
interface ObjectExpression <: Expression {
    type: "ObjectExpression";
    properties: [ Property ];
}
```



#### Property

对象表达式中的属性节点。`key` 表示键，`value` 表示值，由于 ES5 语法中有 `get/set` 的存在，所以有一个 `kind` 属性，用来表示是普通的初始化，或者是 `get/set`。

```
interface Property <: Node {
    type: "Property";
    key: Literal | Identifier;
    value: Expression;
    kind: "init" | "get" | "set";
}
```



#### FunctionExpression

函数表达式节点。

```
interface FunctionExpression <: Function, Expression {
    type: "FunctionExpression";
}
```



下边是一元运算符相关的表达式部分：

#### UnaryExpression

一元运算表达式节点（`++/--` 是 `update` 运算符，不在这个范畴内），`operator` 表示运算符，`prefix` 表示是否为前缀运算符。`argument` 是要执行运算的表达式。

```
interface UnaryExpression <: Expression {
    type: "UnaryExpression";
    operator: UnaryOperator;
    prefix: boolean;
    argument: Expression;
}
```



#### UnaryOperator

一元运算符，枚举类型，所有值如下：

```
enum UnaryOperator {
    "-" | "+" | "!" | "~" | "typeof" | "void" | "delete"
}
```

#### UpdateExpression

`update` 运算表达式节点，即 `++/--`，和一元运算符类似，只是 `operator` 指向的节点对象类型不同，这里是 `update` 运算符。

```
interface UpdateExpression <: Expression {
    type: "UpdateExpression";
    operator: UpdateOperator;
    argument: Expression;
    prefix: boolean;
}
```



#### UpdateOperator

`update` 运算符，值为 `++` 或 `--`，配合 `update` 表达式节点的 `prefix` 属性来表示前后。

```
enum UpdateOperator {
    "++" | "--"
}
```

下边是二元运算符相关的表达式部分：

#### BinaryExpression

二元运算表达式节点，`left` 和 `right` 表示运算符左右的两个表达式，`operator` 表示一个二元运算符。

```
interface BinaryExpression <: Expression {
    type: "BinaryExpression";
    operator: BinaryOperator;
    left: Expression;
    right: Expression;
}
```



#### BinaryOperator

二元运算符，所有值如下：

```
enum BinaryOperator {
    "==" | "!=" | "===" | "!=="
         | "<" | "<=" | ">" | ">="
         | "<<" | ">>" | ">>>"
         | "+" | "-" | "*" | "/" | "%"
         | "|" | "^" | "&" | "in"
         | "instanceof"
}
```

#### AssignmentExpression

赋值表达式节点，`operator` 属性表示一个赋值运算符，`left` 和 `right` 是赋值运算符左右的表达式。

```
interface AssignmentExpression <: Expression {
    type: "AssignmentExpression";
    operator: AssignmentOperator;
    left: Pattern | Expression;
    right: Expression;
}
```



#### AssignmentOperator

赋值运算符，所有值如下：（常用的并不多）

```
enum AssignmentOperator {
    "=" | "+=" | "-=" | "*=" | "/=" | "%="
        | "<<=" | ">>=" | ">>>="
        | "|=" | "^=" | "&="
}
```



#### LogicalExpression

逻辑运算表达式节点，和赋值或者二元运算类型，只不过 `operator` 是逻辑运算符类型。

```
interface LogicalExpression <: Expression {
    type: "LogicalExpression";
    operator: LogicalOperator;
    left: Expression;
    right: Expression;
}
```



#### LogicalOperator

逻辑运算符，两种值，即`与` `或`。

```
enum LogicalOperator {
    "||" | "&&"
}
```



#### MemberExpression

成员表达式节点，即表示引用对象成员的语句，`object` 是引用对象的表达式节点，`property` 是表示属性名称，`computed` 如果为 `false`，是表示 `.` 来引用成员，`property` 应该为一个 `Identifier` 节点，如果 `computed` 属性为 `true`，则是 `[]` 来进行引用，即 `property` 是一个 `Expression` 节点，名称是表达式的结果值。

```
interface MemberExpression <: Expression, Pattern {
    type: "MemberExpression";
    object: Expression;
    property: Expression;
    computed: boolean;
}
```



下边是其他的一些表达式：

#### ConditionalExpression

条件表达式，通常我们称之为三元运算表达式，即 `boolean ? true : false`。属性参考条件语句。

```
interface ConditionalExpression <: Expression {
    type: "ConditionalExpression";
    test: Expression;
    alternate: Expression;
    consequent: Expression;
}
```



#### CallExpression

函数调用表达式，即表示了 `func(1, 2)` 这一类型的语句。callee 属性是一个表达式节点，表示函数，arguments 是一个数组，元素是表达式节点，表示函数参数列表。

```
interface CallExpression <: Expression {
    type: "CallExpression";
    callee: Expression;
    arguments: [ Expression ];
}
```



#### NewExpression

`new` 表达式。

```
interface NewExpression <: CallExpression {
    type: "NewExpression";
}
```



#### SequenceExpression

这个就是逗号运算符构建的表达式（不知道确切的名称），`expressions` 属性为一个数组，即表示构成整个表达式，被逗号分割的多个表达式。

```
interface SequenceExpression <: Expression {
    type: "SequenceExpression";
    expressions: [ Expression ];
}
```

