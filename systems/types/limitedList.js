class LimitedList {
    constructor(limit) {
        this.limit = limit
        this.items = []
    }
  
    push(item) {
        if (this.items.length >= this.limit) {
            this.items.shift()
        }
        this.items.push(item)
    }
  
    get() {
        return this.items[this.items.length - 1]
    }
}
  
module.exports = LimitedList