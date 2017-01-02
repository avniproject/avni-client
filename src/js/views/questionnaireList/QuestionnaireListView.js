import {StyleSheet, View, DrawerLayoutAndroid, Text} from 'react-native';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import Path from '../../framework/routing/Path';
import QuestionnaireList from './QuestionnaireList';
import QuestionnaireToolbar from './QuestionnaireToolbar';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';
import GlobalStyles from "../primitives/GlobalStyles";
import MessageService from '../../service/MessageService';
import Colors from '../primitives/Colors';

@Path('/questionnaireList')
class QuestionnaireListView extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
        this.I18n = context.getService(MessageService).getI18n();
    }

    viewName() {
        return "QuestionnaireListView";
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
            <View style={QuestionnaireListView.styles.main}>
                <AppHeader title={this.I18n.t("questionnaireList")} parent={this}/>
                <View style={[GlobalStyles.mainSection, QuestionnaireListView.styles.mainSection]}>
                    <DrawerLayoutAndroid
                        drawerWidth={300}
                        drawerPosition={DrawerLayoutAndroid.positions.Left}
                        renderNavigationView={() => <SettingsView/>}>
                        <QuestionnaireList styles={QuestionnaireListView.styles}/>
                    </DrawerLayoutAndroid>

                    <QuestionnaireToolbar styles={QuestionnaireListView.styles}/>
                </View>
            </View>
        );
    }
}

export default QuestionnaireListView;
