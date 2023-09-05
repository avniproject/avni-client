import General from "../utility/General";
import {WorkItem, WorkList, WorkLists} from 'openchs-models';

class WorklistsFactory {
    static createForAddMember(memberSubject, member, individualRelative, isHeadOfHousehold, relativeGender) {
        const workItem = new WorkItem(General.randomUUID(), WorkItem.type.ADD_MEMBER,
            {
                uuid: memberSubject.uuid,
                subjectTypeName: memberSubject.subjectType.name,
                member: member,
                individualRelative: individualRelative,
                headOfHousehold: isHeadOfHousehold,
                relativeGender: relativeGender,
                groupSubjectUUID: member.groupSubject.uuid
            }
        );
        const workList = new WorkList(`${memberSubject.subjectType.name} `, [workItem]);
        return new WorkLists(workList);
    }
}

export default WorklistsFactory;
