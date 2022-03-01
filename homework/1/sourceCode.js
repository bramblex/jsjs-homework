function foo() {
	foo: while(true) {
		var foo = {
			foo: foo.foo.foo[foo + foo]
		};
		break foo;
	}
}

module.exports = foo;