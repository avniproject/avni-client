import {expect} from "chai";
import {IndividualGeneralHistoryActions as IGHA} from "../../../src/action/individual/IndividualGeneralHistoryActions";
import TestContext from "../views/testframework/TestContext";

const encounterInfo = (uuid) => ({encounter: {uuid}, expand: false});

function loadedState() {
    return {
        ...IGHA.getInitialState(),
        individual: {uuid: "ind-1"},
        programsAvailable: true,
        showCount: 10,
        encounterTypes: [],
        encounters: [encounterInfo("e1"), encounterInfo("e2"), encounterInfo("e3")],
        encounterActions: [{label: "Some Visit"}],
        draftUnScheduledEncounters: [],
    };
}

function draftsOnContext(drafts = []) {
    return new TestContext({
        displayDrafts: true,
        "ind-1": {uuid: "ind-1"},
        unScheduledDrafts: drafts,
    });
}

// Context rich enough for the real onLoad, so its own clone() is exercised end-to-end.
function onLoadContext() {
    return new TestContext({
        displayDrafts: true,
        "ind-1": {
            uuid: "ind-1",
            subjectType: {uuid: "st-1"},
            nonVoidedEncounters: () => [{uuid: "e1"}, {uuid: "e2"}, {uuid: "e3"}],
        },
        encounterTypes: [{uuid: "et-1", displayName: "Visit A"}],
        allowedEntityTypeUuids: ["et-1"],
        unScheduledDrafts: [{individualUuid: "ind-1", constructEncounter: () => ({uuid: "d1"})}],
    });
}

describe("IndividualGeneralHistoryActions", () => {
    it("onLoad -> onRender -> onToggle keeps encounters and encounterActions (full clone path)", () => {
        const ctx = onLoadContext();
        const loaded = IGHA.onLoad(IGHA.getInitialState(), {individualUUID: "ind-1", newEncounterCallback: () => {}}, ctx);
        expect(loaded.encounters).to.have.length(3);
        expect(loaded.encounterActions).to.have.length(1);
        expect(loaded.draftUnScheduledEncounters.map(d => d.encounter.uuid)).to.deep.equal(["d1"]);

        const rendered = IGHA.onRender(loaded, {individualUUID: "ind-1"}, ctx);
        expect(rendered.encounters).to.have.length(3);
        expect(rendered.encounterActions).to.have.length(1);

        const toggled = IGHA.onToggle(rendered, {encounterInfo: {encounter: {uuid: "e2"}, expand: true}});
        expect(toggled.encounters.map(e => e.encounter.uuid).sort()).to.deep.equal(["e1", "e2", "e3"]);
    });

    it("onRender preserves encounters and refreshes drafts", () => {
        const draft = {constructEncounter: () => ({uuid: "d1"})};
        const state = IGHA.onRender(loadedState(), {individualUUID: "ind-1"}, draftsOnContext([draft]));

        expect(state.encounters).to.have.length(3);
        expect(state.encounterActions).to.have.length(1);
        expect(state.displayActionSelector).to.equal(false);
        expect(state.draftUnScheduledEncounters.map(d => d.encounter.uuid)).to.deep.equal(["d1"]);
    });

    it("onRender leaves state untouched when the subject isn't persisted yet (new registration backed out)", () => {
        const state = {...loadedState(), draftUnScheduledEncounters: [encounterInfo("keep")]};
        const ctx = draftsOnContext([{individualUuid: "ind-1", constructEncounter: () => ({uuid: "d1"})}]);

        const result = IGHA.onRender(state, {individualUUID: "not-persisted"}, ctx);
        expect(result).to.equal(state);   // guard returns the same object — drafts NOT wiped
    });

    it("onRender then deleteDraft both scope to the dashboard subject's drafts", () => {
        const ctx = new TestContext({
            displayDrafts: true,
            "ind-1": {uuid: "ind-1"},
            unScheduledDrafts: [
                {individualUuid: "ind-1", constructEncounter: () => ({uuid: "d1"})},
                {individualUuid: "other", constructEncounter: () => ({uuid: "dx"})},
            ],
        });
        const rendered = IGHA.onRender(loadedState(), {individualUUID: "ind-1"}, ctx);
        expect(rendered.draftUnScheduledEncounters.map(d => d.encounter.uuid)).to.deep.equal(["d1"]);

        const afterDelete = IGHA.deleteDraft(rendered, {encounterUUID: "d1"}, ctx);
        expect(afterDelete.draftUnScheduledEncounters.map(d => d.encounter.uuid)).to.deep.equal(["d1"]);
    });

    it("onRender ignores a save for a different subject — doesn't repoint the slice or pull foreign drafts", () => {
        const ctx = new TestContext({
            displayDrafts: true,
            "ind-1": {uuid: "ind-1"},
            "ind-2": {uuid: "ind-2"},
            unScheduledDrafts: [{individualUuid: "ind-2", constructEncounter: () => ({uuid: "d2"})}],
        });
        const state = {...loadedState(), draftUnScheduledEncounters: [encounterInfo("keep")]};  // dashboard = ind-1

        const result = IGHA.onRender(state, {individualUUID: "ind-2"}, ctx);   // a visit saved for ind-2
        expect(result).to.equal(state);   // unchanged: individual stays ind-1, ind-2's drafts not pulled in
    });

    it("toggle after onRender keeps all encounters", () => {
        const afterBackOut = IGHA.onRender(loadedState(), {individualUUID: "ind-1"}, draftsOnContext());
        const afterToggle = IGHA.onToggle(afterBackOut, {encounterInfo: {encounter: {uuid: "e2"}, expand: true}});

        expect(afterToggle.encounters).to.have.length(3);
        expect(afterToggle.encounters.map(e => e.encounter.uuid).sort()).to.deep.equal(["e1", "e2", "e3"]);
    });

    it("onRender without drafts enabled returns state unchanged", () => {
        const state = loadedState();
        expect(IGHA.onRender(state, {individualUUID: "ind-1"}, new TestContext({}))).to.equal(state);
    });
});
