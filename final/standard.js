let windowObj = null
let globalObj = null

try {
    windowObj = window
} catch (e) { }

try {
    globalObj = global
} catch (e) { }

const StandardMap = {
    // Function properties
    isFinite: isFinite,
    isNaN: isNaN,
    parseFloat: parseFloat,
    parseInt: parseInt,
    decodeURI: decodeURI,
    decodeURIComponent: decodeURIComponent,
    encodeURI: encodeURI,
    encodeURIComponent: encodeURIComponent,

    // Fundamental objects
    Object: Object,
    Function: Function,
    Boolean: Boolean,
    Symbol: Symbol,
    Error: Error,
    EvalError: EvalError,
    RangeError: RangeError,
    ReferenceError: ReferenceError,
    SyntaxError: SyntaxError,
    TypeError: TypeError,
    URIError: URIError,

    // Numbers and dates
    Number: Number,
    Math: Math,
    Date: Date,

    // Text processing
    String: String,
    RegExp: RegExp,

    // Indexed collections
    Array: Array,
    Int8Array: Int8Array,
    Uint8Array: Uint8Array,
    Uint8ClampedArray: Uint8ClampedArray,
    Int16Array: Int16Array,
    Uint16Array: Uint16Array,
    Int32Array: Int32Array,
    Uint32Array: Uint32Array,
    Float32Array: Float32Array,
    Float64Array: Float64Array,

    // Structured data
    ArrayBuffer: ArrayBuffer,
    DataView: DataView,
    JSON: JSON,

    // // Other
    window: windowObj,
    global: globalObj,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Promise: Promise
}

module.exports = StandardMap