import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EntityQueue, GroupRole, GroupSubject, Individual, Concept} from "avni-models";
import EntityService from "./EntityService";
import General from "../utility/General";
import _ from 'lodash';

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

    addMember(groupSubject) {
        const groupSubjectEntity = GroupSubject.create(groupSubject);
        this.saveOrUpdate(groupSubjectEntity);
    }

    deleteMember(groupSubject) {
        const groupSubjectFromDB = this.findByUUID(groupSubject.uuid);
        const member = groupSubjectFromDB.cloneForEdit();
        member.membershipEndDate = groupSubject.membershipEndDate.value;
        member.voided = true;
        this.saveOrUpdate(member);
    }

    saveOrUpdate(groupSubject) {
        const db = this.db;
        this.db.write(() => {
            this.saveGroupSubject(db, groupSubject);
        });
        return groupSubject;
    }

    saveGroupSubject(db, groupSubject) {
        const savedGroupSubject = db.create(GroupSubject.schema.name, groupSubject, true);
        let groupSubjectInd = this.getService(EntityService).findByUUID(groupSubject.groupSubject.uuid, Individual.schema.name);
        let memberSubjectInd = this.getService(EntityService).findByUUID(groupSubject.memberSubject.uuid, Individual.schema.name);
        groupSubjectInd.addGroupSubject(savedGroupSubject);
        memberSubjectInd.addGroup(savedGroupSubject);
        db.create(EntityQueue.schema.name, EntityQueue.create(savedGroupSubject, GroupSubject.schema.name));
        General.logDebug('GroupSubjectService', 'Member Saved');
    }

    getAllGroups(memberSubject) {
        return this.filtered(`voided = false AND memberSubject.uuid = $0`, memberSubject.uuid)
            .filtered('TRUEPREDICATE DISTINCT(groupSubject.uuid)')
    }

    getFirstGroupForMember(memberSubjectUUID, groupSubjectTypeUUID, groupSubjectRoleUUID) {
        const groupSubject = this.getAllNonVoided()
            .filtered('memberSubject.uuid = $0 and groupSubject.subjectType.uuid = $1 and groupRole.uuid = $2', memberSubjectUUID, groupSubjectTypeUUID, groupSubjectRoleUUID);
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

    addSubjectToGroup(subject, db) {
        return ({groupSubject}) => {
            groupSubject.memberSubject = subject;
            if (groupSubject.voided) {
                groupSubject.membershipEndDate = new Date();
            }
            this.saveGroupSubject(db, groupSubject);
        };
    }
}


export default GroupSubjectService;
