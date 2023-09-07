import General from "../utility/General";
import {WorkItem, WorkList, WorkLists} from 'openchs-models';

class WorklistsFactory {
    static createForAddMemberWizardLastPage(memberSubject, member, individualRelative, isHeadOfHousehold, relativeGender) {
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

    static createForAddMemberStart(subjectType, member, individualRelative, isHeadOfHousehold, relativeGender) {
        const params = {
            subjectTypeName: subjectType.name,
            member: member,
            groupSubjectUUID: member.groupSubject.uuid,
            individualRelative: individualRelative,
            headOfHousehold: isHeadOfHousehold,
            relativeGender: relativeGender
        };

        return new WorkLists(new WorkList(subjectType.name).withAddMember(params));
    }
}

export default WorklistsFactory;
