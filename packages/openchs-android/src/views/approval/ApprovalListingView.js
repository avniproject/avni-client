import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import {SafeAreaView, SectionList, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import React from "react";
import ApprovalDetailsCard from "./ApprovalDetailsCard";
import DropDownPicker from 'react-native-dropdown-picker';
import {ReportCard, Form} from 'avni-models';
import _ from 'lodash';
import EntityService from "../../service/EntityService";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import Icon from 'react-native-vector-icons/FontAwesome';
import FormMappingService from "../../service/FormMappingService";

@Path('/approvalListingView')
class ApprovalListingView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.array.isRequired,
        onApprovalSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string.isRequired,
        onBackFunc: PropTypes.func.isRequired,
        reportCardUUID: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.state = {results: this.props.results}
    }

    viewName() {
        return 'ApprovalListingView';
    }

    componentWillMount() {
        super.componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => this.dispatchAction(this.props.indicatorActionName, {loading: false}), 0);
        }
    }

    renderItem(item, section, onApprovalSelection) {
        const entity = item;
        const schema = section.title;
        return (
            <TouchableNativeFeedback key={entity.uuid}
                                     onPress={() => onApprovalSelection(this, item, schema)}
                                     background={TouchableNativeFeedback.SelectableBackground()}>
                <View style={styles.cardContainer}>
                    <ApprovalDetailsCard entity={entity}/>
                </View>
            </TouchableNativeFeedback>
        )
    }

    onFilterChange({value}) {
        const schemaAndQueryFilter = value;
        const reportCard = this.getService(EntityService).findByUUID(this.props.reportCardUUID, ReportCard.schema.name);
        const {result} = this.getService(ReportCardService).getStandardReportCardResultForEntity(reportCard, schemaAndQueryFilter);
        this.setState({results: result});
    }

    renderFilter(title) {
        const options = this.getService(FormMappingService).getAllNonVoided()
            .map((fm) => ({label: fm.form.name, value: fm.getSchemaAndFilterQuery()}));
        const optionsWithAll = [{label: 'All', value: {schema: null, filterQuery: null}}, ...options];
        const total = _.map(this.state.results, ({data}) => data.length).reduce((total, l) => total + l, 0);
        return (
            <View style={styles.filterContainer}>
                <View style={{flex: 0.5, flexWrap: 'wrap'}}>
                    <Text style={{color: Colors.DetailsTextColor}}>{`Showing ${total} ${title} requests`}</Text>
                </View>
                <View style={{flex: 0.5}}>
                    <DropDownPicker
                        items={optionsWithAll}
                        containerStyle={{height: 40}}
                        itemStyle={{justifyContent: 'flex-start'}}
                        placeholder={'Select type'}
                        dropDownStyle={{backgroundColor: '#fafafa'}}
                        arrowColor={Colors.DefaultPrimaryColor}
                        onChangeItem={this.onFilterChange.bind(this)}
                        customArrowUp={() => <Icon name={'caret-up'} size={18}/>}
                        customArrowDown={() => <Icon name={'caret-down'} size={18}/>}
                    />
                </View>
            </View>
        )
    }

    onBackPress() {
        this.props.onBackFunc();
        this.goBack();
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const title = this.props.headerTitle;
        const onApprovalSelection = this.props.onApprovalSelection;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)} func={this.onBackPress.bind(this)}/>
                {this.renderFilter(this.I18n.t(title))}
                <CHSContent>
                    <SafeAreaView style={styles.container}>
                        <SectionList
                            sections={this.state.results}
                            keyExtractor={(item, index) => item.individual.uuid + index}
                            renderItem={({item, section}) => this.renderItem(item, section, onApprovalSelection)}
                        />
                    </SafeAreaView>
                </CHSContent>
            </CHSContainer>
        )
    }

}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16
    },
    cardContainer: {
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 5,
        paddingBottom: 5,
        borderRadius: 5,
    },
    filterContainer: {
        marginHorizontal: 16,
        marginVertical: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    }
});


export default ApprovalListingView;
