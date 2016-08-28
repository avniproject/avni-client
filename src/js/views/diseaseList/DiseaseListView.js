import {StyleSheet, View, DrawerLayoutAndroid, Dimensions} from 'react-native';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path, {PathRoot} from '../../framework/routing/Path';
import QuestionnaireList from './QuestionnaireList';
import QuestionnaireToolbar from './QuestionnaireToolbar';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';
import {Global} from "../primitives/GlobalStyles";
import MessageService from '../../service/MessageService';
import Colors from '../primitives/Colors';

@PathRoot
@Path('/diseaseList')
class DiseaseListView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    static styles = StyleSheet.create({
        main: {
            flex: 1,
            flexDirection: 'column'
        },
        mainSection: {
            flex: 1,
            flexDirection: 'column',
        },
        questionnaireList: {
            justifyContent: 'center',
            flexDirection: 'row',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            marginTop: 15,
        },
        questionnaireButtonWrapper: {
            borderRadius: 5,
            backgroundColor: Colors.Primary,
            width: 120,
            height: 100,
            margin: 5,
        },
        questionnaireButton: {
            color: '#FFFFFF',
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            flex: 1,
            fontSize: 23
        },
        questionnaireToolBarMain: {
            marginBottom: 30,
            flexDirection: 'row',
            justifyContent: 'center'
        },
        toolbarButtonContainer: {
            marginHorizontal: 4
        },
    });

    render() {
        return (
            <View style={DiseaseListView.styles.main}>
                <AppHeader title="questionnaireList" parent={this}/>
                <View style={[Global.mainSection, DiseaseListView.styles.mainSection]}>
                    <DrawerLayoutAndroid
                        drawerWidth={300}
                        drawerPosition={DrawerLayoutAndroid.positions.Left}
                        renderNavigationView={() => <SettingsView/>}>
                        <QuestionnaireList styles={DiseaseListView.styles}/>
                    </DrawerLayoutAndroid>

                    <QuestionnaireToolbar styles={DiseaseListView.styles}/>
                </View>
            </View>
        );
    }
}

export default DiseaseListView;
