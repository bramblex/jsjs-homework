function* get() {
  var a = 123;
  yield a;
  var b = "hello world";
  var c = yield b;
  return c;
}
