import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Observations from "../common/Observations";
import {Card} from "native-base";
import {IndividualRegistrationDetailsActionsNames as Actions} from "../../action/individual/IndividualRegistrationDetailsActions";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import ObservationsSectionTitle from '../common/ObservationsSectionTitle';
import Relatives from "../common/Relatives";
import ContextAction from "../viewmodel/ContextAction";
import DGS from "../primitives/DynamicGlobalStyles";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/IndividualRegistrationDetailView')
class IndividualRegistrationDetailView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'IndividualRegistrationDetailView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualRegistrationDetails);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    getRelativeActions() {
        return [new ContextAction('add', () => {CHSNavigator.navigateToAddRelativeView(this, this.state.individual,
            (source) => CHSNavigator.navigateToIndividualRegistrationDetails(source, this.state.individual))})];
    }

    renderRelatives(){
        return (
            <View>
                <ObservationsSectionTitle contextActions={this.getRelativeActions()}
                                          title={'Relatives'}/>
                <Relatives relatives={this.state.individual.relatives}
                              style={{marginVertical: DGS.resizeHeight(8)}}/>
            </View>
        );
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}}>
                <CHSContent style={{backgroundColor: Styles.defaultBackground}}>
                    <AppHeader title={this.I18n.t('viewProfile')}/>
                    <IndividualProfile individual={this.state.individual} viewContext={IndividualProfile.viewContext.Individual} programsAvailable={this.state.programsAvailable}/>

                    <Card style={{ flexDirection: 'column', borderRadius: 5, marginHorizontal: 16, backgroundColor: Styles.whiteColor, paddingHorizontal:8}}>
                        <Observations observations={this.state.individual.observations} style={{marginVertical: 21}}/>
                        {this.renderRelatives()}
                    </Card>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualRegistrationDetailView;