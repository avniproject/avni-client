var C = require('./common');

var getNextGroup = function (encounter, currentFormElementGroup) {
    var formName = currentFormElementGroup.name;
    var strokeWithinLast48Hrs = C.getDataFromObservation(encounter.observations, "last48hrs");

    if (formName === 'Screening') {
        var strokeSymptoms = ['Weakness of one side of body', 'Inability to speak or understand','Numbness or clumsiness of one side of body','Loss of vision','Unsteadiness of walking'];
        var suspectedStoke = encounter.observations.some(function (observation) {
            var symptomExists = strokeSymptoms.some(function (strokeSymptom) {
                return strokeSymptom === observation.concept.name;
            });
            return observation.valueJSON.answer && symptomExists;
        });
        if(suspectedStoke === false) return 'BP Measurement';
        else if (suspectedStoke === true && strokeWithinLast48Hrs === true) {
            return 'CT Scan';
        }
        else if (suspectedStoke === true && strokeWithinLast48Hrs === false) {
            return 'Advice ASPIRIN 75';
        }
    }

    var systolic = C.getDataFromObservation(encounter.observations, 'systolic');
    var diastolic = C.getDataFromObservation(encounter.observations, 'diastolic');
    if (formName === 'Take BP' && strokeWithinLast48Hrsast48Hrs === true){
        if (systolic > 180 || diastolic > 110){
            return 'Advice for BP Control';
        }
        else return "Advice for supportive care";
    }
    if (formName === 'Take BP' && strokeWithinlast48Hrs === false){
        if (systolic > 180 || diastolic > 110){
            return 'Treat then';
        }
        else if (systolic > 140 || diastolic > 90){
            return 'Advice Physician appointment';
        }
        else return "Diabetes Screen";
    }
};

module.exports = {
    getNextGroup: getNextGroup
};
