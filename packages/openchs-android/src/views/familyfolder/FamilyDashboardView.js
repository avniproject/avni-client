import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {FamilyDashboardActions as Actions} from "../../action/familyFolder/FamilyDashboardActions";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";

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
        this.getForm = this.getForm.bind(this);
    }

    componentWillMount() {
        return super.componentWillMount();
    }

    componentDidMount() {
        this.dispatchOnLoad();
    }

    dispatchOnLoad() {
        setTimeout(() => this.dispatchAction(Actions.ON_LOAD, this.props), 200);
    }

    componentWillUnmount() {
        this.dispatchAction(Actions.RESET);
        super.componentWillUnmount();
    }

    componentWillReceiveProps() {
        if (this.state.possibleExternalStateChange) {
            this.dispatchOnLoad();
        }
    }


    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <View/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default FamilyDashboardView;