const rename = require('./rename')
const sourceCode = require('./sourceCode')


let result = rename(sourceCode, 'foo', 'bar');

console.log(result);