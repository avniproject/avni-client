import {expect} from 'chai';
import * as o from '../config/decision/VHW_Lokbiradari';
import QuestionnaireAnswers from "../js/models/QuestionnaireAnswers";
import _ from 'lodash';

describe('Make Decision', () => {
    it('Regression for all diseases, to ensure there are no exceptions', () => {
        var questionnaireAnswers = new QuestionnaireAnswers();

        _.keys(o.treatmentByDiagnosisAndCode).forEach((diagnosis) => {
            o.weightRangesToCode.forEach((weightRangeToCode) => {
                ["Male", "Female"].forEach((gender) => {
                    questionnaireAnswers.set("Diagnosis", diagnosis);
                    questionnaireAnswers.set("Weight", weightRangeToCode.start);
                    questionnaireAnswers.set("Sex", gender);
                    console.log(`##### ${diagnosis}, ${weightRangeToCode.start}, ${gender}  ######`);
                    var decisions = o.VHW_Lokbiradari_getDecision(questionnaireAnswers);
                    expect(decisions.length).to.equal(1);
                });
            });
        });
    });
});