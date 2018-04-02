import wfa_boys from "../../health_modules/child/anthropometry/wfa_boys";
import lhfa_boys from "../../health_modules/child/anthropometry/lhfa_boys";
import wfa_girls from "../../health_modules/child/anthropometry/wfa_girls";
import lhfa_girls from "../../health_modules/child/anthropometry/lhfa_girls";

const dataFn = (enrolment) => {
    return enrolment.individual.isMale()? {weightForAge: wfa_boys, heightForAge: lhfa_boys}:
        {weightForAge: wfa_girls, heightForAge: lhfa_girls};
};

const config = {
    programDashboardButtons: [{
        label: "Growth Chart",
        openOnClick: {
            type: "growthChart",
            data: dataFn
        }
    }]
};

export default config;