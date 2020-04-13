import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {GroupRole, GroupSubject, Individual, EntityQueue} from "avni-models";
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
            const savedMember = db.create(GroupSubject.schema.name, groupSubject, true);
            let groupSubjectInd = this.getService(EntityService).findByUUID(groupSubject.groupSubject.uuid, Individual.schema.name);
            groupSubjectInd.addGroupSubject(savedMember);
            db.create(EntityQueue.schema.name, EntityQueue.create(savedMember, GroupSubject.schema.name));
            General.logDebug('GroupSubjectService', 'Member Saved');
        });
        return groupSubject;
    }

    getAllGroups(memberSubject) {
        return this.filtered(`voided = false AND memberSubject.uuid = $0`, memberSubject.uuid)
            .filtered('TRUEPREDICATE DISTINCT(groupSubject.uuid)')
    }
}


export default GroupSubjectService;
