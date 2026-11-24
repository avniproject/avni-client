class TransactionManager {
    constructor(db) {
        this.db = db;
    }

    runInTransaction(fn) {
        if (this.isInTransaction) {
            return fn();
        }
        return this.db.write(fn);
    }

    write(fn) {
        return this.db.write(fn);
    }

    get isInTransaction() {
        return this.db.isInTransaction;
    }

    updateDatabase(db) {
        this.db = db;
    }
}

export default TransactionManager;
