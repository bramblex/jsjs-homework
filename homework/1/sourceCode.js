// sourceCode
function foo() {
    // Block Statement
	foo: while(true) {
		var foo = {
			foo: foo.foo.foo[foo + foo]
		};
		break foo;
	}
}

// targetCode
function bar() {
    // Block Statement 
	foo: while(true) {
		var bar = {
			foo: bar.foo.foo[bar + bar]
		};
		break foo;
	}
}

// Block Statement 不被重命名
// 对方法名进行重命名

function bar() {
    foo: while (true) {
      var foo = {
        foo: foo.foo.foo[foo + foo]
      };
      break foo;
    }
  }