# 作业1 —— 写一个变量改名器

## 作业要求：
1. `npm install` 安装依赖；
3. 补全 `rename.js` 里面的代码中的 `transform(code, originName, targetName)` 函数，使其能将 `code` 中所有变量名从 `originName` 改成 `targetName`；
4. `yarn test-homework-1` 可以执行本作业的测试用例，是作业通过 `rename.test.js` 中的测试用例 （运算表达式只需要实现 + 即可通过测试）；

## 提示：
1. 所有的变量名都是 type 为 `Identifier`，但不是所有 `Identifier` 都是变量名；
2. 所有 Node 的定义 [https://github.com/estree/estree/blob/master/es5.md](https://github.com/estree/estree/blob/master/es5.md)；
3. 可以将测试用例中的代码复制进 [https://astexplorer.net/](https://astexplorer.net/) 中查看其生成 AST；