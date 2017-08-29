class ObservationRule {
    static ENROLMENT_DATE_VALIDITY = 'enrolmentDate';

    static create(conceptName, {allowedOccurrences = -1, validFrom = 0, validTill = Number.MAX_SAFE_INTEGER, validityBasedOn = ObservationRule.ENROLMENT_DATE_VALIDITY}) {
        const observationRule = new ObservationRule();
        observationRule.conceptName = conceptName;
        observationRule.allowedOccurrences = allowedOccurrences;
        observationRule.validFrom = validFrom;
        observationRule.validTill = validTill;
        observationRule.validityBasedOn = validityBasedOn;
        return observationRule;
    }
}

export default ObservationRule;