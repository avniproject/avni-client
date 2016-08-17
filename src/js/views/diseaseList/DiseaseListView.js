import {StyleSheet, View, DrawerLayoutAndroid} from 'react-native';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path, {PathRoot} from '../../framework/routing/Path';
import QuestionnaireList from './QuestionnaireList';
import QuestionnaireToolbar from './QuestionnaireToolbar';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';
import {Global} from "../primitives/GlobalStyles";
import MessageService from '../../service/MessageService';

@PathRoot
@Path('/diseaseList')
class DiseaseListView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
        this.handleChange = this.handleChange.bind(this);
        this.state = {questionnaires: [], exporting: false};
        context.getStore().subscribe(this.handleChange);
    }

    handleChange() {
        this.setState({questionnaires: this.context.getStore().getState().questionnaires});
    }

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flex: 2,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: 15
        },
        sessionButtonContainer: {
            marginHorizontal: 4
        }
    });

    render() {
        return (
            <View style={{flex: 1, flexDirection: 'column', justifyContent: 'space-between', flexWrap: 'wrap'}}>
                <AppHeader title="questionnaireList" parent={this}/>
                <View style={[Global.mainSection, {flex: 1, flexWrap: 'wrap'}]}>
                    <DrawerLayoutAndroid
                        drawerWidth={300}
                        drawerPosition={DrawerLayoutAndroid.positions.Left}
                        renderNavigationView={() => <SettingsView/>}>
                        <QuestionnaireList questionnaires={this.state.questionnaires}
                                           style={DiseaseListView.styles.list}/>
                    </DrawerLayoutAndroid>

                    <QuestionnaireToolbar style={DiseaseListView.styles.sessionButtonContainer}/>
                </View>
            </View>
        );
    }
}

export default DiseaseListView;
