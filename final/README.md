# 《前端也要会的编译原理之用 JavaScript 写一个 JavaScript 解释器》期终作业



## 作业要求：

1. 以作业 3 为基础，实现剩下的能力的 ES5 能力，within 和 forin 不要求实现。
2. 要求实现 es6：
   1. 箭头函数
   2. 块作用域 (const / let)
   3. generator 函数
   4. async 函数
3. 执行 `npm test-final` 或者 `yarn test-final` 执行测试用例，通过全部测试用例。
4. `customEval` 函数会返回程序的 `module.exports` 的值。



## 评分要点：

1. 满分 100 分。
2. 总共 156 个 test case，每通过一个 test case 得 0.5 分，全部通过得 80 分。
3. async 函数使用原生 generator 实现得 10 分；手动实现 async 函数和 generator  得 20分；



## 要点提示：

1. 注意箭头函数和普通函数的 this 区别，以及 this 的指向。
2. 控制流如 for / while 等还有一个 label 语义，不要忘了。
3. try catch 里面如果有 return，在 return 之前需要先执行 finally 的代码再 return。
4. 使用可变参数 new 比较魔法，这里直接给出：`new (func.bind.apply(func, [null].concat(args)))`



## 作业提交：

见群里的作业提交文档，不懂的可以找课代表？