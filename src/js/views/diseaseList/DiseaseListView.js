import  {StyleSheet, View, ListView, DrawerLayoutAndroid, Text, TouchableHighlight, Alert} from 'react-native';
import React, {Component} from 'react';
import Path from '../../framework/routing/Path';
import QuestionnaireButton from './QuestionnaireButton';
import AppHeader from '../primitives/AppHeader';
import SettingsView from '../settings/SettingsView';
import {Global} from "../primitives/GlobalStyles";
import I18n from '../../utility/Messages';
import TypedTransition from "../../framework/routing/TypedTransition";
import ConclusionListView from "../conclusion/ConclusionListView";

@Path('/diseaseList')
class DiseaseListView extends Component {

    constructor(props, context) {
        super(props, context);
        const questionnaires = context.getService("questionnaireService").getQuestionnaireNames();
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
            marginTop: 30
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
            I18n.t('deleteConfirmation'),
            I18n.t("numberOfSessions", {count: service.getNumberOfSessions()}),
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
        TypedTransition.from(this).to(ConclusionListView);
    };

    render() {
        return (
            //TODO: Separate this out in another component
            <View
                style={{flex: 1, flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#ffffff'}}>
                <DrawerLayoutAndroid
                    drawerWidth={300}
                    drawerPosition={DrawerLayoutAndroid.positions.Left}
                    renderNavigationView={() => <SettingsView/>}>
                    <View>
                        <AppHeader title="questionnaireList" parent={this}/>
                        <ListView
                            contentContainerStyle={DiseaseListView.styles.list}
                            dataSource={this.state.dataSource}
                            renderRow={(questionnaire) => <QuestionnaireButton questionnaire={questionnaire}/>}
                        />
                    </View>
                </DrawerLayoutAndroid>

                <View style={{marginBottom: 30}}>
                    <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                        <TouchableHighlight onPress={this.onViewSavedSessionsPress}>
                            <View style={Global.actionButtonWrapper}>
                                <Text style={Global.actionButton}>{I18n.t("viewSavedSessions")}</Text>
                            </View>
                        </TouchableHighlight>
                        <TouchableHighlight onPress={this.onExportPress}>
                            <View style={Global.actionButtonWrapper}>
                                <Text style={Global.actionButton}>{I18n.t("export")}</Text>
                            </View>
                        </TouchableHighlight>
                        <TouchableHighlight onPress={this.onDeleteSessionsPress}>
                            <View style={Global.actionButtonWrapper}>
                                <Text style={Global.actionButton}>{I18n.t("deleteSessions")}</Text>
                            </View>
                        </TouchableHighlight>
                    </View>
                </View>
            </View>
        );
    }
}

export default DiseaseListView;
