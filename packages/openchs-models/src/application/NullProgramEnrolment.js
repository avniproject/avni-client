class NullProgramEnrolment {
    constructor(individual) {
        this.individual = individual;
        this.program = {uuid: null};
    }

    nonVoidedEncounters() {
        return [];
    }

    get isActive() {
        return false;
    }

    get observations() {
        return [];
    }

    get encounters() {
        return [];
    }

    get uuid() {
        return null;
    }
}

export default NullProgramEnrolment;