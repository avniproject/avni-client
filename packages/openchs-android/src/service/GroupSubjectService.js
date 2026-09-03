import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityQueue, GroupRole, GroupSubject, Individual, Concept} from "avni-models";
import EntityService from "./EntityService";
import General from "../utility/General";
import _ from 'lodash';
import IndividualRelationshipService from "./relationship/IndividualRelationshipService";

@Service("groupSubjectService")
class GroupSubjectService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return GroupSubject.schema.name;
    }

    getGroupSubjects(groupSubject) {
        return this.findAll().filtered('voided = false AND groupSubject.uuid = $0', groupSubject.uuid);
    }

    getGroupRoles(groupSubjectType) {
        return this.getAll(GroupRole.schema.name).filtered('voided = false and groupSubjectType.uuid = $0', groupSubjectType.uuid).map(_.identity);
    }

    addMember(groupSubject, addRelative, individualRelative) {
        this.addMembers([groupSubject], addRelative, individualRelative);
    }

    addMembers(members, addRelative, individualRelative) {
        const entities = members.map(member => this.buildGroupSubject(member));
        this.transactionManager.write(() => {
            if (addRelative && individualRelative.isRelationPresent()) {
                this.getService(IndividualRelationshipService).addOrUpdateRelative(individualRelative)
            }
            entities.forEach(entity => this.saveGroupSubject(entity));
        });
    }

    buildGroupSubject(member) {
        const entityService = this.getService(EntityService);
        // Re-fetch the linked entities: the ones held in reducer state can be stale copies.
        return GroupSubject.create({
            uuid: member.uuid,
            groupSubject: entityService.findByUUID(member.groupSubject.uuid, Individual.schema.name),
            memberSubject: entityService.findByUUID(member.memberSubject.uuid, Individual.schema.name),
            groupRole: entityService.findByUUID(member.groupRole.uuid, GroupRole.schema.name),
            membershipStartDate: member.membershipStartDate,
            membershipEndDate: member.membershipEndDate,
        });
    }

    deleteMember(groupSubject) {
        const groupSubjectFromDB = this.findByUUID(groupSubject.uuid);
        const member = groupSubjectFromDB.cloneForEdit();
        member.membershipEndDate = groupSubject.membershipEndDate.value;
        member.removalReasonConceptUUID = groupSubject.removalReasonConceptUUID;
        member.voided = true;
        this.saveOrUpdate(member);
    }

    saveOrUpdate(groupSubject) {
        this.transactionManager.write(() => {
            this.saveGroupSubject(groupSubject);
        });
        return groupSubject;
    }

    saveGroupSubject(groupSubject) {
        // Only a *different* membership row for the same member is a duplicate add; the same
        // uuid means the user is editing that membership (e.g. its start date) and must upsert.
        const duplicateAdd = !_.isEmpty(this.getGroupSubjects(groupSubject.groupSubject)
            .filter(gs => gs.memberSubject.uuid === groupSubject.memberSubject.uuid && gs.uuid !== groupSubject.uuid));
        if (groupSubject.voided || !duplicateAdd) {
            const savedGroupSubject = this.repository.create(groupSubject, true);
            let groupSubjectInd = this.getService(EntityService).findByUUID(groupSubject.groupSubject.uuid, Individual.schema.name);
            let memberSubjectInd = this.getService(EntityService).findByUUID(groupSubject.memberSubject.uuid, Individual.schema.name);
            groupSubjectInd.addGroupSubject(savedGroupSubject);
            memberSubjectInd.addGroup(savedGroupSubject);
            this.getRepository(Individual.schema.name).create(groupSubjectInd, true);
            this.getRepository(Individual.schema.name).create(memberSubjectInd, true);
            this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(savedGroupSubject, GroupSubject.schema.name));
            General.logDebug('GroupSubjectService', 'Member Saved');
        } else {
            General.logDebug('GroupSubjectService', 'Member already exists. Not creating duplicate.');
        }
    }

    getAllGroups(memberSubject) {
        return this.filtered(`voided = false AND memberSubject.uuid = $0`, memberSubject.uuid)
            .filtered('TRUEPREDICATE DISTINCT(groupSubject.uuid)')
    }

    populateGroupsThatTheIndividualIsAMemberOf(memberSubject, groupAffiliationState) {
        _.forEach(this.getAllGroups(memberSubject), groupSubject => {
            if (!_.isNil(groupSubject)) {
                groupAffiliationState.groupSubjectObservations.push({groupSubject})
            }
        })
    }

    getFirstGroupForMember(memberSubjectUUID, groupSubjectTypeUUID, groupSubjectRoleUUID) {
        const groupSubject = this.getAllNonVoided()
            .filtered('memberSubject.uuid = $0 and groupSubject.subjectType.uuid = $1 and groupRole.uuid = $2', memberSubjectUUID, groupSubjectTypeUUID, groupSubjectRoleUUID).map(_.identity);
        return _.isEmpty(groupSubject) ? null : groupSubject[0];
    }

    populateGroups(memberSubjectUUID, form, groupAffiliationState) {
        if (_.isNil(form)) return groupAffiliationState;
        _.forEach(form.getFormElementsOfType(Concept.dataType.GroupAffiliation), fe => {
            const groupSubject = this.getFirstGroupForMember(memberSubjectUUID, fe.recordValueByKey('groupSubjectTypeUUID'), fe.recordValueByKey('groupSubjectRoleUUID'));
            if (!_.isNil(groupSubject)) {
                groupAffiliationState.groupSubjectObservations.push({concept: fe.concept, groupSubject})
            }
        })
    }

    addSubjectToGroup(subject) {
        return ({groupSubject}) => {
            groupSubject.memberSubject = subject;
            if (groupSubject.voided) {
                groupSubject.membershipEndDate = new Date();
            }
            this.saveGroupSubject(groupSubject);
        };
    }

    getAllByGroupSubjectUUID(groupSubjectUUID, subjectTypeUUID) {
        return this.getAllNonVoided().filtered(`groupSubject.uuid = $0 and memberSubject.subjectType.uuid = $1`, groupSubjectUUID, subjectTypeUUID);
    }
}


export default GroupSubjectService;
