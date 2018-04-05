import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import * as React from "react";
import {LineChart} from 'react-native-charts-wrapper';
import {
    Text,
    View,
    processColor, StyleSheet
} from 'react-native';

import _ from 'lodash';

@Path('/GrowthChartView')
class GrowthChartView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    settings = {
        SD3neg: {
            color: "red",
            label: "Grade 3",
            alpha: 150
        },
        SD2neg: {
            color: "orange",
            label: "Grade 2",
            alpha: 150
        },
        SD0: {
            color: "green",
            label: "Grade 1",
            alpha: 30
        },
        SD2: {
            color: "green",
            label: "Grade 1",
            alpha: 30
        },
        SD3: {
            color: "green",
            label: "Grade 1",
            alpha: 30
        }
    };

    viewName() {
        return 'GrowthChartView';
    }

    constructor(props, context) {
        super(props, context);
    }

    datasetLabel(labelKey) {
        return {
            "SD3neg": "Grade 3",
            "SD2neg": "Grade 2",
            "SD0": "Grade 1"

        }[labelKey] || "";
    }

    datasetColor(labelKey) {
        return {
            "SD3neg": "blue",
            "SD2neg": "red",
            "SD0": "green",
            "SD2": "red",
            "SD3": "blue"
        }[labelKey] || "black";
    }

    getDataSet(array, line) {
        const settings = this.settings[line];
        return {
            values: _.map(array, (item) => {
                return {x: item.Month, y: item[line]}
            }),
            label: settings.label,
            config: {
                lineWidth: 1,
                drawValues: false,
                circleRadius: 0,
                highlightEnabled: true,
                drawHighlightIndicators: true,
                color: processColor(settings.color),
                drawFilled: true,
                valueTextSize: 10,
                drawCircleHole: false,
                drawCircles: false,
                dashedLineEnabled: true,
                fillColor: processColor(settings.color),
                fillAlpha: settings.alpha,
                // circleColor: processColor('red')
            }
        }
    }

    getDataSets(array) {
        return _.map(["SD3", "SD2", "SD0", "SD2neg", "SD3neg"], (line) => this.getDataSet(array, line));
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
            maxSizePercent: 0.5,
            labelCount: 5,
            // custom: {
            //     colors: [processColor('red'), processColor('red')],
            //     labels: ['REFER', 'USER',]
            // }
        };
        const marker = {
            enabled: true,
            markerColor: processColor('#F0C0FF8C'),
            textColor: processColor('white'),
            markerFontSize: 14,
        };
        const selectedEntry = "";
        const data = {
            dataSets: this.getDataSets(this.props.params.data.weightForAge)
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
            <View style={{flex: 1}}>

                <View style={{height: 80}}>
                    <Text> selected entry</Text>
                    <Text> {selectedEntry}</Text>
                </View>

                <View style={styles.container}>
                    <LineChart
                        style={styles.chart}
                        data={data}
                        chartDescription={{text: ''}}
                        // legend={legend}
                        marker={marker}

                        drawGridBackground={true}

                        borderColor={borderColor}
                        borderWidth={1}
                        drawBorders={true}

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
