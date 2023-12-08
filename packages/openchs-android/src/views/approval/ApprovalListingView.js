import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import {FlatList, SafeAreaView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import React from "react";
import DropDownPicker from 'react-native-dropdown-picker';
import {getUnderlyingRealmCollection, Individual, ReportCard} from 'openchs-models';
import EntityService from "../../service/EntityService";
import ReportCardService from "../../service/customDashboard/ReportCardService";
import Icon from 'react-native-vector-icons/FontAwesome';
import FormMappingService from "../../service/FormMappingService";
import SubjectApprovalView from "./SubjectApprovalView";

const placeHolderPicker = {label: 'All', value: {schema: null, filterQuery: null}};

@Path('/approvalListingView')
class ApprovalListingView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.object.isRequired,
        onApprovalSelection: PropTypes.func.isRequired,
        headerTitle: PropTypes.string.isRequired,
        backFunction: PropTypes.func.isRequired,
        reportCardUUID: PropTypes.string.isRequired,
        approvalStatus_status: PropTypes.string.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.state = {results: this.props.results, selectedFilterPicker: placeHolderPicker, allFilterItems: []};
    }

    viewName() {
        return 'ApprovalListingView';
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => {
                this.dispatchAction(this.props.indicatorActionName, {loading: false});
                const options = this.getService(FormMappingService).getAllWithEnableApproval()
                    .map((fm) => ({label: fm.form.name, value: fm.getSchemaAndFilterQuery()}));
                const optionsWithAll = [placeHolderPicker, ...options];
                this.setState({allFilterItems: optionsWithAll});
            }, 0);
        }
    }

    onFilterChange({value}) {
        const schemaAndQueryFilter = value;
        const reportCard = this.getService(EntityService).findByUUID(this.props.reportCardUUID, ReportCard.schema.name);
        const {result} = this.getService(ReportCardService).getStandardReportCardResultForEntity(reportCard, schemaAndQueryFilter);
        this.setState({results: result, selectedFilterPicker: schemaAndQueryFilter});
    }

    openFilterPicker(value) {
        this.setState({filterPickerOpened: value});
    }

    renderFilter(title) {
        const {allFilterItems, filterPickerOpened, selectedFilterPicker, results} = this.state;
        return (
            <View style={styles.filterContainer}>
                <View>
                    <Text style={{color: Colors.DetailsTextColor}}>{`Total ${results.length} subjects`}</Text>
                </View>
                <View style={{marginTop: 10}}>
                    <DropDownPicker
                        items={allFilterItems}
                        open={filterPickerOpened}
                        setOpen={(value) => this.openFilterPicker(value)}
                        itemStyle={{justifyContent: 'flex-start'}}
                        placeholder={'Select type'}
                        dropDownStyle={{backgroundColor: '#fafafa'}}
                        arrowColor={Colors.DefaultPrimaryColor}
                        onSelectItem={this.onFilterChange.bind(this)}
                        value={selectedFilterPicker}
                        customArrowUp={() => <Icon name={'caret-up'} size={18}/>}
                        customArrowDown={() => <Icon name={'caret-down'} size={18}/>}
                    />
                </View>
            </View>
        )
    }

    onBackPress() {
        this.props.backFunction();
    }

    render() {
        General.logDebug("ApprovalListingView", 'render');
        const title = this.props.headerTitle;
        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)} func={this.onBackPress.bind(this)}/>
                {this.renderFilter(this.I18n.t(title))}
                <FlatList
                    data={getUnderlyingRealmCollection(this.state.results)}
                    keyExtractor={(item) => item.uuid}
                    renderItem={(x) =>
                        <SubjectApprovalView subject={new Individual(x.item)} approvalStatus_status={this.props.approvalStatus_status}
                                             onApprovalSelection={(entity) => this.props.onApprovalSelection(this, entity)}/>}
                    initialNumToRender={50}
                    updateCellsBatchingPeriod={500}
                    maxToRenderPerBatch={20}
                />
            </CHSContainer>
        )
    }
}

const styles = StyleSheet.create({
    filterContainer: {
        marginHorizontal: 16,
        marginVertical: 20,
        flexDirection: 'column',
        alignItems: 'center'
    }
});

export default ApprovalListingView;
