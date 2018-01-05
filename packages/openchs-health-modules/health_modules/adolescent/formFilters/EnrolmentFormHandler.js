import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

export default class EnrolmentFormHandler {
    parents(programEnrolment, formElement) {
        return this._hasBeenComingToSchool(programEnrolment, formElement)
            .or(this._registeredAtVillage(programEnrolment, formElement));
    }

    fathersOccupation(programEnrolment, formElement) {
        return this._fatherIsAlive(programEnrolment, formElement);
    }

    fathersAddiction(programEnrolment, formElement) {
        return this._fatherIsAlive(programEnrolment, formElement);
    }

    mothersOccupation(programEnrolment, formElement) {
        return this._motherIsAlive(programEnrolment, formElement);
    }

    mothersAddiction(programEnrolment, formElement) {
        return this._motherIsAlive(programEnrolment, formElement);
    }

    stayingWithWhom(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);

        statusBuilder.skipAnswers("Parents").when
            .valueInEnrolment("Parents' life status").containsAnswerConceptName("Both Expired");
        statusBuilder.show()
            .when.valueInEnrolment("School going").containsAnswerConceptName("Yes")
            .or.when.addressType.equals("Village");

        return statusBuilder.build();
    }

    numberOfFamilyMembers(programEnrolment, formElement) {
        return this._hasBeenComingToSchool(programEnrolment, formElement)
            .or(this._registeredAtVillage(programEnrolment, formElement));
    }

    numberOfBrothers(programEnrolment, formElement) {
        return this._hasBeenComingToSchool(programEnrolment, formElement)
            .or(this._registeredAtVillage(programEnrolment, formElement));
    }

    numberOfSisters(programEnrolment, formElement) {
        return this._hasBeenComingToSchool(programEnrolment, formElement)
            .or(this._registeredAtVillage(programEnrolment, formElement));
    }

    chronicSicknessInFamily(programEnrolment, formElement) {
        return this._hasBeenComingToSchool(programEnrolment, formElement)
            .or(this._registeredAtVillage(programEnrolment, formElement));
    }


    causeOfDeath(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Death');
        return statusBuilder.build();
    }

    causeOfDeathUnspecifiedAbove(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show()
            .when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Death')
            .and.valueInExit("Cause of Death").containsAnyAnswerConceptName('Other');
        return statusBuilder.build();
    }

    ageAtMarriage(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Marriage');
        return statusBuilder.build();
    }


    _fatherIsAlive(programEnrolment, formElement) {
        return this._parentStatusContains(["Both Alive", "Only Father Alive", "Separated"], programEnrolment, formElement);
    }

    _motherIsAlive(programEnrolment, formElement) {
        return this._parentStatusContains(["Both Alive", "Only Mother Alive", "Separated"], programEnrolment, formElement);
    }

    _parentStatusContains(statuses, programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Parents' life status").containsAnyAnswerConceptName(...statuses);

        return statusBuilder.build();
    }

    _schoolAttendanceStatus(programEnrolment, formElement, requiredAnswer) {
        const statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("School going").containsAnswerConceptName(requiredAnswer);
        return statusBuilder.build();
    }

    _isDroppedOut(programEnrolment, formElement) {
        return this._schoolAttendanceStatus(programEnrolment, formElement, "Dropped Out");
    }

    _hasBeenComingToSchool(programEnrolment, formElement) {
        return this._schoolAttendanceStatus(programEnrolment, formElement, "Yes");
    }


    _registeredAt(programEnrolment, formElement, placeOfRegistration) {
        const statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.addressType.equals(placeOfRegistration);
        return statusBuilder.build();
    }

    _registeredAtSchoolOrBoarding(programEnrolment, formElement) {
        return this._registeredAt(programEnrolment, formElement, "School")
            .or(this._registeredAt(programEnrolment, formElement, "Boarding"));
    }

    _registeredAtVillage(programEnrolment, formElement) {
        return this._registeredAt(programEnrolment, formElement, "Village");
    }

    _villageRegistrationAndDroppedOut(programEnrolment, formElement) {
        return this._registeredAtVillage(programEnrolment, formElement)
            .and(this._isDroppedOut(programEnrolment, formElement));
    }

    _schoolRegistrationAndDroppedOut(programEnrolment, formElement) {
        return this._registeredAtSchoolOrBoarding(programEnrolment, formElement)
            .and(this._isDroppedOut(programEnrolment, formElement));
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }
}
