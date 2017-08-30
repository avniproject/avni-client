import {View, } from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {ProgramEnrolmentsActionsNames as Actions} from "../../action/program/ProgramEnrolmentsActions";
import moment from "moment";
import TabularListView from "../common/TabularListView";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from '../../utility/CHSNavigator';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";

@Path('/ProgramEnrolmentsView')
class ProgramEnrolmentsView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'ProgramEnrolmentsView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.programEnrolments);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {programUUID: this.props.params.programUUID});
        return super.componentWillMount();
    }

    static displayItemsForProgramEnrolment(programEnrolment) {
        const displayItems = [];
        displayItems.push(moment(programEnrolment.enrolmentDateTime).format('DD-MM-YYYY'));
        displayItems.push(programEnrolment.individual.name);
        displayItems.push(programEnrolment.individual.lowestAddressLevel.name);
        return displayItems;
    }

    render() {
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <AppHeader title={`${this.I18n.t('allEnrolmentsInProgram')}: ${this.state.programName}`}/>
                    <View style={{paddingHorizontal: DGS.resizeWidth(12)}}>
                        <TabularListView data={this.state.enrolments}
                                         tableTitle={''}
                                         getRow={ProgramEnrolmentsView.displayItemsForProgramEnrolment}
                                         handleClick={(enrolment) => CHSNavigator.navigateToProgramEnrolmentDashboardView(this, enrolment.individual.uuid, enrolment.uuid)}
                                         headerTitleKeys={['enrolledOn', 'name', 'lowestAddressLevel']}
                                         emptyTableMessage={this.I18n.t('noEnrolments')}
                        />
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default ProgramEnrolmentsView;