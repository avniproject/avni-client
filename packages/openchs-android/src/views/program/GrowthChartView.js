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

    viewName() {
        return 'GrowthChartView';
    }

    constructor(props, context) {
        super(props, context);
    }

    mapToXY(array, yName) {
        console.log(array);
        return _.map(array, (item) => {
            return {x: item.Month, y: item[yName]}
        });
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
            custom: {
                colors: [processColor('red'), processColor('red')],
                labels: ['REFER', 'USER',]
            }
        };
        const marker = {
            enabled: true,
            markerColor: processColor('#F0C0FF8C'),
            textColor: processColor('white'),
            markerFontSize: 14,
        };
        const selectedEntry = "";
        const data = {
            dataSets: [
                {
                    values: this.mapToXY(this.props.params.data.weightForAge, 'SD0'),
                    label: 'Hello',
                    config: {
                        lineWidth: 1,
                        drawValues: true,
                        circleRadius: 5,
                        highlightEnabled: true,
                        drawHighlightIndicators: true,
                        color: processColor('red'),
                        drawFilled: true,
                        valueTextSize: 10,
                        fillColor: processColor('red'),
                        fillAlpha: 45,
                        valueFormatter: "$###.0",
                        circleColor: processColor('red')
                    }
                }
            ]
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
                        legend={legend}
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
