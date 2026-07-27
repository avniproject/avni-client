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

describe("IndividualGeneralHistoryActions", () => {
    it("onRender preserves encounters and refreshes drafts", () => {
        const draft = {constructEncounter: () => ({uuid: "d1"})};
        const state = IGHA.onRender(loadedState(), {individualUUID: "ind-1"}, draftsOnContext([draft]));

        expect(state.encounters).to.have.length(3);
        expect(state.encounterActions).to.have.length(1);
        expect(state.displayActionSelector).to.equal(false);
        expect(state.draftUnScheduledEncounters.map(d => d.encounter.uuid)).to.deep.equal(["d1"]);
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

    it("onShowMore preserves encounters while bumping showCount", () => {
        const state = IGHA.onShowMore(loadedState());

        expect(state.encounters).to.have.length(3);
        expect(state.showCount).to.be.above(10);
    });
});
