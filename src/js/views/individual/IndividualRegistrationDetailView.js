import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import IndividualProfile from "../common/IndividualProfile";
import Observations from "../common/Observations";
import {Card, Container, Content} from "native-base";
import {IndividualRegistrationDetailsActionsNames as Actions} from "../../action/individual/IndividualRegistrationDetailsActions";
import General from "../../utility/General";
import Colors from '../primitives/Colors';
import Distances from "../primitives/Distances";

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

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <Container theme={themes}>
                <Content style={{backgroundColor: Colors.BlackBackground}}>
                    <AppHeader title={this.I18n.t('viewProfile')}/>
                    <IndividualProfile individual={this.state.individual} viewContext={IndividualProfile.viewContext.Individual}/>
                    <Card style={{
                        flexDirection: 'column',
                        marginHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                        borderRadius: 5,
                        paddingHorizontal: Distances.ScaledContentDistanceWithinContainer
                    }}>
                        <Observations observations={this.state.individual.observations} style={{marginVertical: 21}}/>
                    </Card>
                </Content>
            </Container>
        );
    }
}

export default IndividualRegistrationDetailView;