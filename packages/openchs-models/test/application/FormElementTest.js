import {assert} from "chai";
import EntityFactory from "../EntityFactory";
import Concept from '../../src/Concept';

describe("FormElementTest", () => {
    describe("Form Element Type Test", () => {
        it("Should return concept type if concept is of type Numeric", () => {
            const numericConcept = EntityFactory.createConcept("Numeric Concept", Concept.dataType.Numeric, "af7d8c4f-9513-47b8-8ef2-4c964ca708be");
            const formElement = EntityFactory.createFormElement("Numeric Form Element", true, numericConcept, 1);
            const formElementType = formElement.getType();
            assert.equal(Concept.dataType.Numeric, formElementType);
        });

        it("Should return concept type if concept is of type Text", () => {
            const textConcept = EntityFactory.createConcept("Text Concept", Concept.dataType.Text, "fea4897f-e5ec-404e-af19-babfc59c2420");
            const formElement = EntityFactory.createFormElement("Text Form Element", true, textConcept, 1);
            const formElementType = formElement.getType();
            assert.equal(Concept.dataType.Text, formElementType);
        });

        it("Should return concept type if concept is of type Date", () => {
            const dateConcept = EntityFactory.createConcept("Date Concept", Concept.dataType.Date, "9ac36dba-8645-445f-935a-b5faf6bc1d17");
            const formElement = EntityFactory.createFormElement("Date Form Element", true, dateConcept, 1);
            const formElementType = formElement.getType();
            assert.equal(Concept.dataType.Date, formElementType);
        });

        it("Should return concept type if concept is of type Duration", () => {
            const durationConcept = EntityFactory.createConcept("Duration Concept", Concept.dataType.Duration, "bca500eb-541c-4d0a-baf6-5aa18c8230f2");
            const formElement = EntityFactory.createFormElement("Numeric Form Element", true, durationConcept, 1);
            const formElementType = formElement.getType();
            assert.equal(Concept.dataType.Duration, formElementType);
        });

        it("Should return form type if concept is of type Coded", () => {
            const codedConcept = EntityFactory.createConcept("Coded Concept", Concept.dataType.Coded, "af7d8c4f-9513-47b8-8ef2-4c964ca708be");
            let formElement = EntityFactory.createFormElement("Single Select Form Element", true, codedConcept, 1, "SingleSelect");
            let formElementType = formElement.getType();
            assert.equal("SingleSelect", formElementType);

            formElement = EntityFactory.createFormElement("Multi Select Form Element", true, codedConcept, 1, "SingleSelect");
            formElementType = formElement.getType();
            assert.equal("SingleSelect", formElementType);
        });
    });


});