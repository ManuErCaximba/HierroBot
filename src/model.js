class Info {
    constructor(id, displayName) {
        this.id = id;
        this.displayName = displayName;
        this.data = null;
    }
}

class DateTuple {
    constructor(date, time) {
        this.date = date;
        this.time = time;
    }
}

module.exports = {Info, DateTuple};