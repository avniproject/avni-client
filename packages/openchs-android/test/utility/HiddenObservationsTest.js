import _ from "lodash";
import {Concept, Observation, PrimitiveValue, QuestionGroup, RepeatableQuestionGroup} from "openchs-models";
import TestConceptFactory from "../model/TestConceptFactory";
import {visibleGroupObservations, visibleObservations} from "../../src/utility/HiddenObservations";

const HIDDEN = [{key: "hidden", value: true}];
const text = (name, keyValues = []) => TestConceptFactory.createWithDefaults({name, dataType: Concept.dataType.Text, keyValues});
const group = (name) => TestConceptFactory.createWithDefaults({name, dataType: Concept.dataType.QuestionGroup});
const answer = (concept, value) => Observation.create(concept, new PrimitiveValue(value));
const conceptServiceOf = (...concepts) => ({getConceptByUUID: (uuid) => _.find(concepts, (c) => c.uuid === uuid)});
const names = (observations) => observations.map((observation) => observation.concept.name);

describe("HiddenObservations", () => {
    const seen = text("Seen answer");
    const other = text("Other answer");
    const verdict = text("AI verdict", HIDDEN);
    const conceptService = conceptServiceOf(seen, other, verdict);

    it("leaves out a value recorded against a hidden concept and keeps the rest in order", () => {
        const observations = [answer(seen, "a"), answer(verdict, "b"), answer(other, "c")];

        expect(names(visibleObservations(observations, conceptService))).toEqual(["Seen answer", "Other answer"]);
    });

    it("leaves out a hidden answer inside a question group", () => {
        expect(names(visibleGroupObservations([answer(seen, "a"), answer(verdict, "b")], conceptService))).toEqual(["Seen answer"]);
    });

    it("reads a group answer's concept as it is now, not as it was stored with the answer", () => {
        const verdictAsStored = text("AI verdict");
        const verdictNow = TestConceptFactory.create({uuid: verdictAsStored.uuid, name: "AI verdict", dataType: Concept.dataType.Text, keyValues: HIDDEN});

        expect(visibleGroupObservations([answer(verdictAsStored, "b")], conceptServiceOf(verdictNow))).toEqual([]);
    });

    it("reads the stored concept when the concept cannot be found", () => {
        const stored = [answer(verdict, "b"), answer(seen, "a")];

        expect(names(visibleGroupObservations(stored, conceptServiceOf()))).toEqual(["Seen answer"]);
    });

    it("keeps a question group that still has an answer to show", () => {
        const qg = Observation.create(group("Group"), new QuestionGroup([answer(seen, "a"), answer(verdict, "b")]));

        expect(names(visibleObservations([qg], conceptService))).toEqual(["Group"]);
    });

    it("leaves out a question group whose every answer is hidden", () => {
        const qg = Observation.create(group("Group"), new QuestionGroup([answer(verdict, "b")]));

        expect(visibleObservations([qg], conceptService)).toEqual([]);
    });

    it("leaves out a repeating group whose every answer, in every repeat, is hidden", () => {
        const rqg = Observation.create(group("Block"), new RepeatableQuestionGroup([
            new QuestionGroup([answer(verdict, "b1")]), new QuestionGroup([answer(verdict, "b2")])]));

        expect(visibleObservations([rqg], conceptService)).toEqual([]);
    });

    it("keeps a repeating group when one repeat still has an answer to show", () => {
        const rqg = Observation.create(group("Block"), new RepeatableQuestionGroup([
            new QuestionGroup([answer(verdict, "b1")]), new QuestionGroup([answer(seen, "a")])]));

        expect(names(visibleObservations([rqg], conceptService))).toEqual(["Block"]);
    });

    it("keeps a question group with no answers, as today", () => {
        const empty = Observation.create(group("Empty"), new QuestionGroup([]));
        const noValue = Observation.create(group("No value"), null);

        expect(names(visibleObservations([empty, noValue], conceptService))).toEqual(["Empty", "No value"]);
    });

    it("returns an empty list for a missing list", () => {
        expect(visibleObservations(undefined, conceptService)).toEqual([]);
        expect(visibleGroupObservations(undefined, conceptService)).toEqual([]);
    });
});
