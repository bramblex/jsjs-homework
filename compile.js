"use strict";

var _marked = /*#__PURE__*/regeneratorRuntime.mark(get);

function get() {
  var a, b, c;
  return regeneratorRuntime.wrap(function get$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          a = 123;
          _context.next = 3;
          return a;

        case 3:
          b = "hello world";
          _context.next = 6;
          return b;

        case 6:
          c = _context.sent;
          return _context.abrupt("return", c);

        case 8:
        case "end":
          return _context.stop();
      }
    }
  }, _marked);
}
