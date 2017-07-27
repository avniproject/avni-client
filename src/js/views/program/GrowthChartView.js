import {View} from "native-base";
import {Dimensions} from "react-native";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import * as React from "react";
import themes from "../primitives/themes";
import {VictoryChart, VictoryLine, VictoryAxis, VictoryScatter} from "victory-native";
import {Button, Text} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";
import * as _ from "lodash";
import Fonts from '../primitives/Fonts';
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader"
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";


@Path('/GrowthChartView')
class GrowthChartView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    viewName() {
        return 'GrowthChartView';
    }

    buttons = {
        LESS_THAN_13_WEEKS: {data: "graphsBelow13Weeks", label: this.I18n.t('lessThan13Weeks'), minAge: 0},
        LESS_THAN_2_YEARS: {data: "graphsBelow2Years", label: this.I18n.t('lessThan2Years'), minAge: 3},
        LESS_THAN_5_YEARS: {data: "graphsBelow5Years", label: this.I18n.t('2To5Years'), minAge: 24},
    };

    shouldBeDisabled(button) {
        return this.props.params.enrolment.individual.getAgeInMonths() < button.minAge;
    }

    changeCharts(chart) {
        this.setState(() => chart);
    }

    defaultCharts() {
        const graphs = this.props.params.data;
        const ageInMonths = this.props.params.enrolment.individual.getAgeInMonths();

        if (ageInMonths < 3) return {
            title: this.I18n.t('lessThan13Weeks'),
            graphsToBeShown: graphs.graphsBelow13Weeks
        };

        if (ageInMonths < 25) return {
            title: this.I18n.t('lessThan2Years'),
            graphsToBeShown: graphs.graphsBelow2Years
        };

        return {
            title: this.I18n.t('2To5Years'),
            graphsToBeShown: graphs.graphsBelow5Years
        };
    }

    constructor(props, context) {
        super(props, context);
    }

    componentWillMount() {
        super.componentWillMount();
        this.changeCharts(this.defaultCharts());
    }

    renderObservations(observations, dataIndex) {
        if (observations.length > 0) {
            return (<VictoryScatter data={observations} key={dataIndex} labels={(datum) => datum.y}/>);
        }
    }

    renderLegendItem(percentile, color, index) {
        return (
            <View style={{flexDirection: 'row', justifyContent: "center", marginBottom: 20}} key={index} >
                <View style={{backgroundColor: color, height: 20, width: 20}}/>
                <Text style={{minWidth: 40, fontSize: Fonts.Medium, marginLeft: DGS.resizeWidth(10)}}>{percentile} %</Text>
            </View>
        );
    }

    renderChart(chart, index) {
        const data = chart.data(this.props.params.enrolment);
        const referenceLines = _.dropRight(data);
        const observations = _.last(data);
        const dataIndex = data.length - 1;
        const colors = ["red", "orange", "green", "orange", "red"];
        const percentiles = [10, 25, 50, 75, 90];
        const lightGreyLine = {stroke: "grey", opacity: 0.2};
        return (
            <View style={{flexDirection: 'column', flex: 1, alignItems: 'center', marginBottom: 20}} key={index}>
                <Text style={{fontSize: Fonts.Large, fontWeight: 'bold', color: Colors.InputNormal}}> {chart.title} </Text>
                <VictoryChart padding={40}>
                    <VictoryAxis orientation="bottom" label={chart.xAxisLabel} tickCount={10}
                                 style={{grid: lightGreyLine}}/>
                    <VictoryAxis dependentAxis={true} orientation="left" tickCount={10} style={{grid: lightGreyLine}}/>
                    {_.map(referenceLines, (data, idx) => (
                        <VictoryLine data={data} key={idx} name="a" style={{data: {stroke: colors[idx], opacity: 0.2}}}/>))}
                    {this.renderObservations(observations, dataIndex)}
                </VictoryChart>
                <View style={{flexDirection: 'row', justifyContent: "center", flexWrap: "nowrap"}}>
                    {_.map(percentiles, (percentile, index) => this.renderLegendItem(percentile, colors[index], index))}
                </View>
            </View>
        );
    }

    renderOverlayForSmoothScrolling() {
        return <View style={{flex: 1, position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, opacity: 1}}/>;
    }


    render() {
        General.logDebug("GrowthChartView", 'render');
        const individualName = this.props.params.enrolment.individual.name;
        const titleStyle = _.merge(Fonts.Title, {
            alignSelf: 'center',
            marginTop: DGS.resizeHeight(10),
            marginBottom: DGS.resizeTextInputHeight(10)
        });
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Styles.whiteColor}}>
                <CHSContent>
                    <AppHeader title={`${individualName} - Growth Chart`}/>
                    <View>
                        <View style={{flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-around'}}>
                            {_.map(this.buttons, (button, index) => {
                                return (
                                    <Button
                                        textStyle={{color: Styles.whiteColor}}
                                        style={{marginTop: DGS.resizeHeight(10)}}
                                        disabled={this.shouldBeDisabled(button)}
                                        key={index}
                                        onPress={() => this.changeCharts( {
                                            title: button.label,
                                            graphsToBeShown: this.props.params.data[button.data]
                                        })}>
                                        {button.label}
                                    </Button>
                                )
                            })}
                        </View>
                        <Text style={titleStyle}>{this.state.title}</Text>
                        <View style={{flexDirection: 'column', flex: 1}}>
                            {_.map(this.state.graphsToBeShown, (graph, index) => this.renderChart(graph, index))}
                        </View>
                        {this.renderOverlayForSmoothScrolling()}
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}
export default GrowthChartView;
