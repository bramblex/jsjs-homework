class BlockInterruption {
    constructor(type, value) {
        this.type = type
        this.value = value
    }
    getType() {
        return this.type
    }
    setLabel(label) {
        this.label = label
    }
    getLabel() {
        return this.label
    }
}
module.exports = BlockInterruption