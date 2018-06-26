import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {FamilyDashboardActionsNames as Actions} from "../../action/familyFolder/FamilyDashboardActions";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import FamilyProfile from './FamilyProfile';
import AppHeader from "../common/AppHeader";

@Path('/FamilyDashboardView')
class FamilyDashboardView extends AbstractComponent {
    static propTypes = {
        familyUUID: React.PropTypes.string.isRequired
    };

    viewName() {
        return 'FamilyDashboardView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.familyDashboard);
    }

    componentWillMount() {
        this.dispatchOnLoad();
        return super.componentWillMount();
    }

    dispatchOnLoad() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
    }

    componentWillUnmount() {
        this.dispatchAction(Actions.RESET);
        super.componentWillUnmount();
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <AppHeader title={this.I18n.t('individualDashboard')}/>
                    <FamilyProfile viewContext={FamilyProfile.viewContext.Family} family={this.state.family}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default FamilyDashboardView;