import {View, StyleSheet} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import ReducerKeys from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import {Container, Content, Text} from "native-base";
import {ChecklistActionsNames as Actions} from '../../action/program/ChecklistActions';
import moment from "moment";

@Path('/ChecklistView')
class ChecklistView extends AbstractComponent {
    static propTypes = {
        enrolmentUUID: React.PropTypes.string.isRequired
    };

    viewName() {
        return ChecklistView.name;
    }

    constructor(props, context) {
        super(props, context, ReducerKeys.checklist);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        return super.componentWillMount();
    }

    render() {
        return (
            <Container theme={themes}>
                <Content>
                    <AppHeader title={this.state.checklist.enrolment.individual.name}/>
                    <Text>{this.state.checklist.name}</Text>
                    <View style={{flexDirection: 'column'}}>
                    {this.state.checklist.items.forEach((item) => {
                        <View style={{flexDirection: 'row'}}>
                            <Text>{item.displayTitle(this.I18n)}</Text>
                            <Text>{moment(item.completionDate).format('DD-MM-YYYY')}</Text>
                        </View>
                    })}
                    </View>
                </Content>
            </Container>
        );
    }
}

export default ChecklistView;