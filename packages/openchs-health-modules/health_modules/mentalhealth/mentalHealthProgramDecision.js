import C from '../common';
import _ from "lodash";
import VisitScheduleBuilder from "../rules/VisitScheduleBuilder";

const order = ["ae900527-6c77-4c5f-99f8-2d2be7bb1efd", "86d4e144-6a3b-4106-9bba-d6b7d6948715", "37d96c8a-b774-4bab-bc24-f9de9896c7a6"];

const getScore = (encounter, concepts, pattern = [0, 1, 2]) => {
    let score = 0;

    concepts.map((concept) => {
        const value = encounter.getObservationValue(concept);
        console.log(value);
        const orderIndex = order.indexOf(value);
        score += pattern[orderIndex];
    });
    return score;
};

const getDecisions = function (programEncounter) {
    const emotional_problems_012 = [
        "3. I get a lot of headaches, stomach-aches or sickness",
        "8. I worry a lot",
        "13. I am often unhappy, down-hearted or tearful",
        "16. I am nervous in new situations. I easily lose confidence",
        "24. I have many fears, I am easily scared"
    ];
    const conduct_problems_012 = [
        "5. I get very angry and often lose my temper",
        "12. I fight a lot. I can make other people do what I want",
        "18. I am often accused of lying or cheating",
        "22. I take things that are not mine from home, school or elsewhere"
    ];
    const conduct_problems_210 = [
        "7. I usually do as I am told"
    ];
    const hyperactivity_012 = [
        "2. I am restless, I cannot stay still for long",
        "10. I am constantly fidgeting or squirming",
        "15. I am easily distracted, I find it difficult to concentrate"
    ];

    const hyperactivity_210 = [
        "21. I think before I do things",
        "25. I finish the work I'm doing. My attention is good"
    ];

    const peer_problems_012 = [
        "6. I am usually on my own, I generally play alone or keep to myself",
        "19. Other children or young people pick on me or bully me",
        "23. I get on better with adults than with people my own age"
    ];

    const peer_problems_210 = [
        "11. I have one good friend or more",
        "14. Other people my age generally like me"
    ];

    const pro_social_012 = [
        "1. I try to be nice to other people. I care about their feelings",
        "4. I usually share with others, for example (food, games, pens, etc.)",
        "9. I am helpful if someone is hurt, upset or feeling ill",
        "17. I am kind to younger children",
        "20. I often volunteer  to help others (parents, teachers, children)"
    ];

    const emotionalScore = getScore(programEncounter, emotional_problems_012);
    const conductScore = getScore(programEncounter, conduct_problems_012) + getScore(programEncounter, conduct_problems_210, [2, 1, 0]);
    const hyperActivityScore = getScore(programEncounter, hyperactivity_012) + getScore(programEncounter, hyperactivity_210, [2, 1, 0]);
    const peerProblemScore = getScore(programEncounter, peer_problems_012) + getScore(programEncounter, peer_problems_210, [2, 1, 0]);
    const prosocialScore = getScore(programEncounter, pro_social_012);
    const totalScore = emotionalScore + conductScore + hyperActivityScore + peerProblemScore + prosocialScore;

    return {
        "encounterDecisions": [
            {"name": "Total Score", "value": totalScore},
            {"name": "Emotional Score", "value": emotionalScore},
            {"name": "Conduct Score", "value": conductScore},
            {"name": "Hyper Activity Score", "value": hyperActivityScore},
            {"name": "Peer Problem Score", "value": peerProblemScore},
            {"name": "Pro Social Score", "value": prosocialScore}]
    }
};

const getNextScheduledVisits = function (programEncounter) {
    const scheduleBuilder = new VisitScheduleBuilder({
        programEnrolment: programEncounter.programEnrolment,
        programEncounter: programEncounter
    });
    let decisions = getDecisions(programEncounter);
    scheduleBuilder.add({
        name: "Counselling Visit",
        encounterType: "SDQ",
        earliestDate: C.addDays(new Date(), 7),
        maxDate: C.addDays(new Date(), 15)
    }).whenItem(decisions.encounterDecisions[0].value).is.greaterThan(15);
    return scheduleBuilder.getAllUnique();
};

export {
    getDecisions,
    getNextScheduledVisits
}