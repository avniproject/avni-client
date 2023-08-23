import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import General from "../../utility/General";
import CHSContainer from "../common/CHSContainer";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import {SectionList, StyleSheet, Text, View} from "react-native";
import React from "react";
import Distances from "../primitives/Distances";
import _ from "lodash";
import IndividualDetails from "../individuallist/IndividualDetails";
import DropDownPicker from "react-native-dropdown-picker";
import Icon from "react-native-vector-icons/FontAwesome";
import Separator from "../primitives/Separator";

const placeHolderPicker = {label: 'All', value: 'All'};

@Path("/checklistListingView")
class ChecklistListingView extends AbstractComponent {
    static propTypes = {
        results: PropTypes.object.isRequired,
        totalSearchResultsCount: PropTypes.number.isRequired,
        headerTitle: PropTypes.string.isRequired,
        indicatorActionName: PropTypes.string,
        backFunction: PropTypes.func,
        iconName: PropTypes.string,
        iconFunction: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            results: this.props.results,
            selectedFilterPicker: placeHolderPicker,
            allFilterItems: [],
            filteredResult: this.props.results
        };
    }

    viewName() {
        return 'ChecklistListingView';
    }


    UNSAFE_componentWillMount() {
        super.UNSAFE_componentWillMount();
    }

    componentDidMount() {
        if (this.props.indicatorActionName) {
            setTimeout(() => {
                this.dispatchAction(this.props.indicatorActionName, {loading: false,status: false})
                const options = _.uniq(this.state.results.checklistItemNames)
                    .map((name) => ({label: name, value: name}));
                const optionsWithAll = [placeHolderPicker, ...options];
                this.setState({allFilterItems: optionsWithAll});
            }, 0);

        }
    }

    renderItems = (item, section, listType, cardType) => {
        const individualWithMetadata = listType === 'total' ? {individual: item, visitInfo: {visitName: []}} : item;
        return (<IndividualDetails
            individualWithMetadata={individualWithMetadata}
            header={section.title}
            backFunction={this.goBack.bind(this)}
            cardType={cardType}/>);
    };

    onFilterChange({value}) {
        function getFilteredIndividuals(individuals, checklistName) {
            let filteredIndArr = [];
            _.forEach(individuals, individual => _.forEach(individual.individual.enrolments, enrolment => _.forEach(enrolment.checklists, checklist => _.forEach(checklist.items, item => {
                let applicableState = item.calculateApplicableState();
                if (!!applicableState.status && applicableState.status.state === 'Due') {
                    if (item.detail.concept.name === checklistName) {
                        filteredIndArr.push(individual)
                    }
                }
            }))))
            return filteredIndArr;
        }

        if (value === 'All') {
            this.setState({
                filteredResult: this.state.results,
                selectedFilterPicker: value
            });
        } else {
            this.setState({
                filteredResult: {
                    individual: getFilteredIndividuals(this.state.results.individual, value)
                },
                selectedFilterPicker: value
            });
        }
    }

    openFilterPicker(value) {
        this.setState({filterPickerOpened: value});
    }

    renderFilter() {
        const {allFilterItems, filterPickerOpened, selectedFilterPicker} = this.state;
        const total = this.state.filteredResult.individual.length;
        const maxFormLength = _.max(_.map(allFilterItems, ({label}) => label.length));
        return (<View style={styles.filterContainer}>
            <View>
                <Text style={{color: Colors.DetailsTextColor}}>{`Total count: ${total}`}</Text>
            </View>
            <View style={{marginTop: 0}}>
                <DropDownPicker
                    items={allFilterItems}
                    open={filterPickerOpened}
                    setOpen={(value) => this.openFilterPicker(value)}
                    containerStyle={{height: maxFormLength}}
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
        </View>)
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let getData = (individuals) => {
            return !!individuals ? [...individuals] : []
        }

        return (
            <CHSContainer theme={{iconFamily: 'MaterialIcons'}} style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader
                    title={`${this.I18n.t(this.props.headerTitle)}`}
                    func={this.props.backFunction}
                    icon={this.props.iconName}
                    iconFunc={this.props.iconFunction}/>
                {this.renderFilter(this.I18n.t(this.props.headerTitle))}
                <Separator backgroundColor={Colors.InputBorderNormal}/>
                <SectionList
                    style={{flex: 1}}
                    keyExtractor={(item) => item.uuid || item.individual.uuid}
                    sections={[{data: getData(this.state.filteredResult.individual)}]}
                    renderItem={({
                                     item, section
                                 }) => this.renderItems(item, section, this.props.listType, this.props.headerTitle)}
                    initialNumToRender={15}
                    updateCellsBatchingPeriod={500}
                    maxToRenderPerBatch={30}
                />
            </CHSContainer>);
    }

}

export default ChecklistListingView;

const styles = StyleSheet.create({
    TextHeaderStyle: {
        color: "rgba(0, 0, 0, 0.87)",
        fontWeight: 'normal',
        fontSize: 15,
        paddingTop: 15,
        paddingLeft: Distances.ScaledContentDistanceFromEdge
    }, filterContainer: {
        marginHorizontal: 1,
        marginVertical: 2,
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 35
    }
});
