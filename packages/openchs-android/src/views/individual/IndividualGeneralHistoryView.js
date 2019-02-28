import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import themes from "../primitives/themes";
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import {Card, Container, Content} from "native-base";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Reducers from "../../reducer";
import DGS from "../primitives/DynamicGlobalStyles";
import PreviousEncounters from "../common/PreviousEncounters";
import _ from "lodash";
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import {Form} from 'openchs-models';

@Path('/IndividualGeneralHistoryView')
class IndividualGeneralHistoryView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return "IndividualGeneralHistoryView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
    }

    componentWillMount() {
        this.dispatchAction(Actions.LOAD_HISTORY, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.individual);
    }

    render() {
        return (
            <CHSContainer theme={themes}>
                <CHSContent style={{backgroundColor: Colors.BlackBackground}}>
                    <AppHeader title={this.I18n.t('generalHistory')}/>
                    <IndividualProfile viewContext={IndividualProfile.viewContext.General} individual={this.state.individual} style={DGS.common.content}
                                       programsAvailable={this.state.programsAvailable}/>
                    <Card style={{
                        flexDirection: 'column',
                        marginHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                        borderRadius: 5,
                        paddingHorizontal: Distances.ScaledContentDistanceWithinContainer
                    }}>
                        <PreviousEncounters encounters={this.state.individual.nonVoidedEncounters()}
                                            formType={Form.formTypes.Encounter}
                                            style={{marginBottom: 21}} onShowMore={() => this.dispatchAction(Actions.SHOW_MORE)} showPartial={true} showCount={this.state.showCount}/>
                    </Card>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualGeneralHistoryView;