import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import * as React from "react";
import {LineChart} from 'react-native-charts-wrapper';
import {Button} from "native-base";

import {
    Text,
    View,
    processColor, StyleSheet, TouchableNativeFeedback
} from 'react-native';
import moment from "moment";

import _ from 'lodash';
import Styles from "../primitives/Styles";

@Path('/GrowthChartView')
class GrowthChartView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    states = {
        weightForAge: "Weight For Age",
        heightForAge: "Height For Age"
    };

    settings = {
        SD3neg: {
            label: "Grade 3",
            config: {
                color: processColor("red"),
                fillColor: processColor("red"),
                fillAlpha: 150
            }
        },
        SD2neg: {
            label: "Grade 2",
            config: {
                color: processColor("orange"),
                fillColor: processColor("orange"),
                fillAlpha: 150
            }
        },
        SD0: {
            label: "Grade 1",
            config: {
                color: processColor("green"),
                fillColor: processColor("green"),
                fillAlpha: 30
            }
        },
        SD2: {
            label: "Grade 1",
            config: {
                color: processColor("green"),
                fillColor: processColor("green"),
            }
        },
        SD3: {
            label: "Grade 1",
            config: {
                color: processColor("green"),
                fillColor: processColor("green"),
                fillAlpha: 30
            }
        },
        data: {
            label: "",
            config: {
                lineWidth: 3,
                color: processColor("black"),
                drawFilled: false,
                drawCircles: true,
                drawCircleHole: false,
                highlightEnabled: true,
                drawValues: true,
                circleRadius: 2,
            }
        }
    };

    viewName() {
        return 'GrowthChartView';
    }

    constructor(props, context) {
        super(props, context);
    }

    graphForSelection(prevState, selectedGraph) {
        return {
            data: selectedGraph === this.states.weightForAge? prevState.weightForAge: prevState.heightForAge,
            title: selectedGraph,
            selectedGraph: selectedGraph
        }
    }

    onGraphSelected(selectedGraph) {
        this.setState((prevState) => this.graphForSelection(prevState, selectedGraph));
    }

    componentWillMount() {
        this.setState(() => {
            const newState = {
                weightForAge: {dataSets: this.getDataSets(this.props.params.data.weightForAge, 'Weight', 'kg')},
                heightForAge: {dataSets: this.getDataSets(this.props.params.data.heightForAge, 'Height', 'cm')}
            };

            return _.merge(newState, this.graphForSelection(newState, this.states.weightForAge));
        });
    }

    addConfig(array, line) {
        return _.merge({
            values: array,
            label: "",
            config: {
                lineWidth: 1,
                drawValues: false,
                circleRadius: 0,
                highlightEnabled: false,
                drawHighlightIndicators: true,
                color: processColor("red"),
                drawFilled: true,
                valueTextSize: 10,
                drawCircleHole: false,
                drawCircles: false,
                dashedLineEnabled: true,
                fillColor: processColor("red"),
                fillAlpha: processColor("red"),
            }
        }, this.settings[line])
    }

    getGridLine(array, line) {
        return _.merge({
            values: _.map(array, (item) => {
                return {x: item.Month, y: item[line]}
            })
        }, this.addConfig(array, line));
    }

    getDataFor(concept, suffix) {
        const enrolment = this.props.params.enrolment;
        let observations = _.map(enrolment.getObservationsForConceptName(concept),
            (observation) => {
                return {
                    x: moment(observation.encounterDateTime).diff(enrolment.individual.dateOfBirth, 'months'),
                    y: observation.obs,
                    marker: `${observation.obs} ${suffix}`
                }
            });
        return this.addConfig(_.sortBy(observations, 'x'), "data");
    }

    getDataSets(array, concept, suffix) {
        return [this.getDataFor(concept, suffix), ..._.map(["SD3", "SD2", "SD0", "SD2neg", "SD3neg"], (line) => this.getGridLine(array, line))];
    }

    static style = {
        graphButton: {
            self: {
                height: 28,
                borderRadius: 2,
                height: 36,
                margin: 4,
                flex: 1
            }
        },
        selectedGraphButton: {
            self: {
                backgroundColor: Styles.accentColor,
            },
            text: {
                color: Styles.whiteColor,
                fontSize: 16
            }
        },
        unselectedGraphButton: {
            self: {
                borderWidth: 1,
                borderColor: Styles.accentColor,
                backgroundColor: Styles.whiteColor
            },
            text: {
                color: Styles.accentColor,
                fontSize: 16
            }
        }
    };

    getWeightGraphStyle() {
        return this.states.weightForAge === this.state.selectedGraph? GrowthChartView.style.selectedGraphButton : GrowthChartView.style.unselectedGraphButton;
    }

    getHeightGraphStyle() {
        return this.states.heightForAge === this.state.selectedGraph? GrowthChartView.style.selectedGraphButton : GrowthChartView.style.unselectedGraphButton;
    }

    render() {
        const legend = {
            enabled: true,
            textColor: processColor('red'),
            textSize: 12,
            position: 'BELOW_CHART_RIGHT',
            form: 'SQUARE',
            formSize: 14,
            xEntrySpace: 10,
            yEntrySpace: 5,
            formToTextSpace: 5,
            wordWrapEnabled: true,
            maxSizePercent: 0.5
        };
        const marker = {
            enabled: true,
            markerColor: processColor('#F0C0FF8C'),
            textColor: processColor('white'),
            markerFontSize: 14,
        };
        const styles = StyleSheet.create({
            container: {
                flex: 1,
                backgroundColor: '#F5FCFF'
            },
            chart: {
                flex: 1
            }
        });
        let borderColor = processColor("red");
        return (
            <View style={{ flex: 1, paddingHorizontal: 8, flexDirection: 'column' }}>
                <View style={{ flexDirection: 'row', paddingTop: 4, justifyContent: 'space-between' }}>

                    <Button style={[GrowthChartView.style.graphButton.self, this.getWeightGraphStyle().self]}
                        textStyle={this.getWeightGraphStyle().text}
                        onPress={() => { this.onGraphSelected(this.states.weightForAge) }}>
                        {this.states.weightForAge}
                    </Button>

                    <Button style={[GrowthChartView.style.graphButton.self, this.getHeightGraphStyle().self]}
                        textStyle={this.getHeightGraphStyle().text}
                        onPress={() => { this.onGraphSelected(this.states.heightForAge) }}>
                        {this.states.heightForAge}
                    </Button>
                </View>

                <Text style={[Styles.formGroupLabel, {paddingLeft: 4}]}>{this.state.title}</Text>

                <View style={styles.container}>
                    <LineChart
                        style={styles.chart}
                        data={this.state.data}
                        chartDescription={{text: ''}}
                        legend={legend}
                        marker={marker}

                        drawGridBackground={true}

                        borderColor={borderColor}
                        borderWidth={0}
                        drawBorders={false}

                        touchEnabled={true}
                        dragEnabled={true}
                        scaleEnabled={true}
                        scaleXEnabled={true}
                        scaleYEnabled={true}
                        pinchZoom={true}
                        doubleTapToZoomEnabled={false}

                        dragDecelerationEnabled={true}
                        dragDecelerationFrictionCoef={0.99}
                        // yAxis={{left: {axisMaximum: 12000}}}

                        keepPositionOnRotation={false}

                        xAxis={{position: 'BOTTOM', labelCount: 5}}

                        // onSelect={this.handleSelect.bind(this)}
                        // onChange={(event) => console.log(event.nativeEvent)}

                        ref="chart"
                    />
                </View>
            </View>
        );
    }
}

export default GrowthChartView;
