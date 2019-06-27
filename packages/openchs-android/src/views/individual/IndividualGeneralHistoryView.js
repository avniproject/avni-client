import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import {View} from 'react-native';
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import {Card, Container, Content} from "native-base";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Reducers from "../../reducer";
import DGS from "../primitives/DynamicGlobalStyles";
import PreviousEncounters from "../common/PreviousEncounters";
import _ from "lodash";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import {Form} from 'openchs-models';
import Styles from "../primitives/Styles";
import Separator from "../primitives/Separator";

@Path('/IndividualGeneralHistoryView')
class IndividualGeneralHistoryView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
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
            <CHSContainer>
                <CHSContent style={{backgroundColor: Colors.GreyContentBackground}}>
                    <AppHeader title={this.I18n.t('generalHistory')}/>
                    <View style={{backgroundColor: Styles.defaultBackground}}>
                        <IndividualProfile viewContext={IndividualProfile.viewContext.General}
                                           individual={this.state.individual} style={DGS.common.content}
                                           programsAvailable={this.state.programsAvailable}/>
                    </View>
                    <View style={{marginHorizontal: 10}}>
                        <PreviousEncounters encounters={this.state.encounters}
                                            formType={Form.formTypes.Encounter}
                                            style={{marginBottom: 21}}
                                            onShowMore={() => this.dispatchAction(Actions.SHOW_MORE)}
                                            showPartial={true}
                                            showCount={this.state.showCount}
                                            title={this.I18n.t('completedEncounters')}
                                            emptyTitle={this.I18n.t('noEncounters')}
                                            expandCollapseView={true}
                                            onToggleAction={Actions.ON_TOGGLE}/>
                    </View>
                    <Separator height={50} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualGeneralHistoryView;
