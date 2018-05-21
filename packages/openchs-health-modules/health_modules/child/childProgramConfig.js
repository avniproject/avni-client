import wfa_boys from "../../health_modules/child/anthropometry/wfa_boys";
import lhfa_boys from "../../health_modules/child/anthropometry/lhfa_boys";
import wfa_girls from "../../health_modules/child/anthropometry/wfa_girls";
import lhfa_girls from "../../health_modules/child/anthropometry/lhfa_girls";
import wflh_boys from "../../health_modules/child/anthropometry/wflh_boys";
import wflh_girls from "../../health_modules/child/anthropometry/wflh_girls";

const dataFn = (enrolment) => {
    return enrolment.individual.isMale()? {weightForAge: wfa_boys, heightForAge: lhfa_boys, weightForHeight: wflh_boys}:
        {weightForAge: wfa_girls, heightForAge: lhfa_girls, weightForHeight: wflh_girls};
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