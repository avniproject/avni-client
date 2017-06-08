import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {DashboardActionNames as Actions} from "../../action/program/DashboardActions";
import themes from "../primitives/themes";
import ProgramDashboard from "../program/ProgramDashboard";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";

@Path('/DashboardView')
class DashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "DashboardView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        return super.componentWillMount();
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.dashboard);
    }

    render() {
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyBackground}}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('dashboard')}/>
                    {this.state.programs.map((programSummary, index) => {
                        return <ProgramDashboard summary={programSummary} key={`programDashboard${index}`}/>;
                    })}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default DashboardView;