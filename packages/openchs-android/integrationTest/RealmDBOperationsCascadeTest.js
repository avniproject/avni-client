import {AddressLevel, Concept, Encounter, EncounterType, Individual, PrimitiveValue, SubjectType} from 'openchs-models';
import TestSubjectTypeFactory from '../test/model/TestSubjectTypeFactory';
import TestEncounterTypeFactory from '../test/model/TestEncounterTypeFactory';
import TestConceptFactory from '../test/model/TestConceptFactory';
import TestAddressLevelFactory from '../test/model/TestAddressLevelFactory';
import TestSubjectFactory from '../test/model/txn/TestSubjectFactory';
import TestObsFactory from '../test/model/TestObsFactory';
import TestEncounterFactory from '../test/model/txn/TestEncounterFactory';
import moment from 'moment/moment';
import {assert} from 'chai';
import {JSONStringify} from '../src/utility/JsonStringify';
import BaseIntegrationTest from './BaseIntegrationTest';

class RealmDBOperationsCascadeTest extends BaseIntegrationTest {

  setup() {
    super.setup();

    this.executeInWrite((db) => {
      const LAST_NAME_VALUE = 'LAST';
      const updateMode = true;
      try {

        //Init subjectType and concept
        this.subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({
          type: SubjectType.types.Person,
          name: 'Beneficiary'
        }));
        this.encounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Bar"}));
        this.originalConcept = db.create(Concept, TestConceptFactory.createWithDefaults({
          name: 'concept-1',
          dataType: Concept.dataType.Text
        }), updateMode);
        this.savedAddressLevel = db.create(AddressLevel, TestAddressLevelFactory.createWithDefaults({level: 1, type: "1"}));

        //Create Individual
        this.individual = db.create(Individual, TestSubjectFactory.createWithDefaults({
          subjectType : this.subjectType,
          address: this.savedAddressLevel,
          firstName: "XYZ",
          lastName: "bar",
          observations: [TestObsFactory.create({
            concept: this.originalConcept,
            valueJSON: JSON.stringify(this.originalConcept.getValueWrapperFor("ABC"))
          })],
          approvalStatuses: []
        }), updateMode);

        //Create encounter
        this.encounter = db.create(Encounter, TestEncounterFactory.create({
          earliestVisitDateTime: moment().add(-2, "day").toDate(),
          maxVisitDateTime: moment().add(2, "day").toDate(),
          encounterType: this.encounterType,
          approvalStatuses: [],
          observations: [TestObsFactory.create({
            concept: this.originalConcept,
            valueJSON: JSON.stringify(this.originalConcept.getValueWrapperFor("ABC"))
          })],
          latestEntityApprovalStatus: null,
          subject: this.individual
        }));

        // Link encounter to individual
        this.individual.addEncounter(this.encounter);

        //Modify individual name and observation value
        this.encounter.individual.lastName = LAST_NAME_VALUE;
        this.encounter.individual.observations[0].valueJSON = JSON.stringify(this.originalConcept.getValueWrapperFor("DEF"));

      } catch (error) {
        assert.fail(error.message);
      }
    });
  }


  saveIndividualShouldNotCascadeUpdateToEncounter() {
    const LAST_NAME_VALUE = 'LAST';
    const updateMode = true;

    let updatedIndividual;

    this.executeInWrite((db) => {
      updatedIndividual = db.create(Individual, this.individual, updateMode);
    });

    //Concept name should remain the same
    assert.equal(updatedIndividual.lastName, LAST_NAME_VALUE);
    assert.equal(updatedIndividual.observations[0].valueJSON, JSONStringify(new PrimitiveValue("DEF", Concept.dataType.Text)));

    //Modify encounter observation value
    // this.encounter.observations[0].valueJSON = JSON.stringify(this.originalConcept.getValueWrapperFor("DEF"));
    let refetchedEncounter;
    this.executeInWrite((db) => {
      refetchedEncounter = db.objectForPrimaryKey(Encounter, this.encounter.uuid);
    });

    assert.equal(refetchedEncounter.observations.length, 1);
    assert.equal(refetchedEncounter.observations[0].valueJSON, JSONStringify(new PrimitiveValue("ABC", Concept.dataType.Text)));

  }
}

export default RealmDBOperationsCascadeTest;
