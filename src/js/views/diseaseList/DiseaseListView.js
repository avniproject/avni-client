import  {StyleSheet, View, ListView, DrawerLayoutAndroid, Text, TouchableHighlight, Alert} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import QuestionnaireButton from './QuestionnaireButton';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';
import {Global} from "../primitives/GlobalStyles";
import TypedTransition from "../../framework/routing/TypedTransition";
import DecisionSupportSessionListView from "../conclusion/DecisionSupportSessionListView";

@Path('/diseaseList')
class DiseaseListView extends Component {
    constructor(props, context) {
        super(props, context);
        const questionnaires = context.getService("questionnaireService").getQuestionnaireNames();
        this.I18n = context.getService("messageService").getI18n();
        this.state = {dataSource: DiseaseListView.initialDataSource().cloneWithRows(questionnaires), exporting: false};
        this.onExportPress = this.onExportPress.bind(this);
    }

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginTop: 15
        },
        sessionButtonContainer: {
            marginHorizontal: 4
        }
    });

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (row_1, row_2) => row_1 !== row_2});

    onExportPress = () => {
        this.setState({exporting: true});
        const service = this.context.getService("exportService");
        service.exportAll(()=> this.setState({exporting: false}));
    };

    onDeleteSessionsPress = () => {
        const service = this.context.getService("decisionSupportSessionService");
        Alert.alert(
            this.I18n.t('deleteConfirmation'),
            this.I18n.t("numberOfSessions", {count: service.getNumberOfSessions()}),
            [
                {
                    text: 'Yes', onPress: () => {
                    service.deleteAll()
                }
                },
                {
                    text: 'No', onPress: () => {
                }, style: 'cancel'
                }
            ]
        )
    };

    onViewSavedSessionsPress = () => {
        TypedTransition.from(this).to(DecisionSupportSessionListView);
    };

    render() {
        return (
            //TODO: Separate this out in another component
            <View
                style={{flex: 1, flexDirection: 'column', justifyContent: 'space-between'}}>
                <AppHeader title="questionnaireList" parent={this}/>
                <View style={[Global.mainSection, {flex: 1}]}>
                    <DrawerLayoutAndroid
                        drawerWidth={300}
                        drawerPosition={DrawerLayoutAndroid.positions.Left}
                        renderNavigationView={() => <SettingsView/>}>
                        <View>
                            <ListView
                                contentContainerStyle={DiseaseListView.styles.list}
                                dataSource={this.state.dataSource}
                                renderRow={(questionnaire) => <QuestionnaireButton questionnaire={questionnaire}/>}
                            />
                        </View>
                    </DrawerLayoutAndroid>

                    <View style={{marginBottom: 30}}>
                        <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                            <TouchableHighlight onPress={this.onViewSavedSessionsPress} style={DiseaseListView.styles.sessionButtonContainer}>
                                <View style={Global.actionButtonWrapper}>
                                    <Text style={Global.actionButton}>{this.I18n.t("viewSavedSessions")}</Text>
                                </View>
                            </TouchableHighlight>
                            <TouchableHighlight onPress={this.onExportPress} style={DiseaseListView.styles.sessionButtonContainer}>
                                <View style={Global.actionButtonWrapper}>
                                    <Text style={Global.actionButton}>{this.I18n.t("export")}</Text>
                                </View>
                            </TouchableHighlight>
                            <TouchableHighlight onPress={this.onDeleteSessionsPress} style={DiseaseListView.styles.sessionButtonContainer}>
                                <View style={Global.actionButtonWrapper}>
                                    <Text style={Global.actionButton}>{this.I18n.t("deleteSessions")}</Text>
                                </View>
                            </TouchableHighlight>
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

export default DiseaseListView;
