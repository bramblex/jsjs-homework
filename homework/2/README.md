根据 AST 划分各个`Expression`，见`eval.js`文件中的分支。

以下为两个特殊的`Operator Set`

```js
enum BinaryOperator {
  "==" | "!=" | "===" | "!=="
      | "<" | "<=" | ">" | ">="
      | "<<" | ">>" | ">>>"
      | "+" | "-" | "*" | "/" | "%"
      | "|" | "^" | "&" | "in"
      | "instanceof"
}
```

```js
enum LogicalOperator {
  "||" | "&&"
}
```
