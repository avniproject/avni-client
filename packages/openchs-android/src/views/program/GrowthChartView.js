import Path from '../../framework/routing/Path';
import AbstractComponent from '../../framework/view/AbstractComponent';
import * as React from 'react';
import {LineChart} from 'react-native-charts-wrapper';
import {Button, Text} from 'native-base';
import PropTypes from 'prop-types';

import {processColor, StyleSheet, View} from 'react-native';
import moment from 'moment';

import _ from 'lodash';
import Styles from '../primitives/Styles';
import CHSContainer from "../common/CHSContainer";

@Path('/GrowthChartView')
class GrowthChartView extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    states = {
        weightForAge: "Weight For Age",
        heightForAge: "Height For Age",
        weightForHeight: "Weight For Height"
    };

    settings = {
        SD3neg: {
            label: this.I18n.t('Grade 3'),
            config: {
                color: processColor("red"),
                fillColor: processColor("red"),
                fillAlpha: 150
            }
        },
        SD2neg: {
            label: this.I18n.t('Grade 2'),
            config: {
                color: processColor("orange"),
                fillColor: processColor("orange"),
                fillAlpha: 150
            }
        },
        SD0: {
            label: this.I18n.t('Grade 1'),
            config: {
                color: processColor("green"),
                fillColor: processColor("green"),
                fillAlpha: 30
            }
        },
        SD2: {
            label: this.I18n.t('Grade 1'),
            config: {
                color: processColor("green"),
                fillColor: processColor("green"),
            }
        },
        SD3: {
            label: this.I18n.t('Grade 1'),
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
                circleColor: processColor("black"),
                highlightEnabled: true,
                drawValues: true,
                circleRadius: 3
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
            data: prevState[_.findKey(this.states, (state) => state === selectedGraph)],
            title: selectedGraph,
            selectedGraph: selectedGraph
        }
    }

    onGraphSelected(selectedGraph) {
        this.setState((prevState) => this.graphForSelection(prevState, selectedGraph));
    }

    UNSAFE_componentWillMount() {
        this.setState(() => {
            const newState = {
                weightForAge: {dataSets: this.getDataSets(this.props.params.data.weightForAge, 'Weight', 'kg')},
                heightForAge: {dataSets: this.getDataSets(this.props.params.data.heightForAge, 'Height', 'cm')},
                weightForHeight: {dataSets: this.getDataSets(this.props.params.data.weightForHeight, 'Weight', 'kg', "Height")}
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
                valueTextSize: 18,
                drawCircleHole: false,
                drawCircles: false,
                dashedLineEnabled: true,
                fillColor: processColor("red"),
                fillAlpha: processColor("red"),
            }
        }, this.settings[line])
    }

    getGridLine(array, line, identifier) {
        return _.merge({
            values: _.map(array, (item) => {
                return {x: item[identifier || "Month"], y: item[line]}
            })
        }, this.addConfig(array, line));
    }

    getObservationValue(entity, conceptName) {
        let observationValue = entity.getObservationValue(conceptName);
        return observationValue ? _.toNumber(observationValue) : null;
    }

    getDataFor(yAxisConceptName, suffix, xAxisConceptName) {
        const enrolmentEntity = this.getEnrolmentEntity();
        const enrolmentEntityObservations=this.getObservationsForEntity(enrolmentEntity,xAxisConceptName, yAxisConceptName, suffix);

        enrolmentEntityObservations.pointInEntity && enrolmentEntityObservations.entityObservations.unshift(enrolmentEntityObservations.pointInEntity);

        const individual = enrolmentEntity.individual;
        const individualEntityObservations=this.getObservationsForEntity(individual,xAxisConceptName, yAxisConceptName, suffix);

        individualEntityObservations.pointInEntity && individualEntityObservations.entityObservations.unshift(individualEntityObservations.pointInEntity);
        const entityObservations = [...enrolmentEntityObservations.entityObservations, ...individualEntityObservations.entityObservations];

        return this.addConfig(_.sortBy(_.compact(entityObservations), 'x'), "data");
    }

    getObservationsForEntity(entity, xAxisConceptName, yAxisConceptName, suffix) {
        const enrolmentEntity = this.getEnrolmentEntity();
        let entityObservations = this.getObservations(entity, xAxisConceptName, yAxisConceptName, suffix);
        const xInEntity = this.getXInEntity(xAxisConceptName, entity);
        const yInEntity = this.getObservationValue(entity, yAxisConceptName);
        const markerInEntity = `${yInEntity} ${suffix}`;
        const pointInEntity = this.getPoint(xInEntity, yInEntity, markerInEntity);
        return {enrolmentEntity, entityObservations, xInEntity, yInEntity, markerInEntity,pointInEntity};
    }

    getEnrolmentEntity = () => {
        return this.props.params.enrolment;
    };
    getPoint = (xInEntity, yInEntity, markerInEntity) => {
        return (_.isNil(xInEntity) || _.isNil(yInEntity))
            ? null
            : {x: xInEntity, y: yInEntity, markerInEntity};
    };
    getXInEntity = (xAxisConceptName, entity) => {
        return xAxisConceptName
            ? this.getObservationValue(entity, xAxisConceptName)
            : moment(entity.enrolmentDateTime).diff(entity.individual.dateOfBirth, "months");
    };

    getObservations(enrolment, xAxisConceptName, yAxisConceptName, suffix) {
        return _.map(enrolment.nonVoidedEncounters(), encounter => {
            const x = xAxisConceptName
                ? this.getObservationValue(encounter, xAxisConceptName)
                : moment(encounter.encounterDateTime).diff(enrolment.individual.dateOfBirth, "months");
            const y = this.getObservationValue(encounter, yAxisConceptName);
            const marker = `${y} ${suffix}`;
            return (_.isNil(x) || _.isNil(y))
                ? null
                : {x, y, marker};
        });
    }

    getDataSets(array, yAxisConcept, suffix, xAxisConcept) {
        let data = this.getDataFor(yAxisConcept, suffix, xAxisConcept);
        data = _.merge(data, {label: `${yAxisConcept} in ${suffix}`});
        this.addBirthWeightIfRequired(yAxisConcept, data, suffix);

        return [data, ..._.map(["SD3", "SD2", "SD0", "SD2neg", "SD3neg"], (line) => this.getGridLine(array, line, xAxisConcept))];
    }

    addBirthWeightIfRequired(yAxisConcept, data, suffix) {
        if (yAxisConcept === 'Weight') {
            const birthWt = this.getEnrolmentEntity().findLatestObservationInEntireEnrolment('Birth Weight');
            if (birthWt) {
                const birthWeight = _.toNumber(birthWt.getValue());
                data.values.unshift({x: 0, y: birthWeight, marker: `${birthWt.getValue()} ${suffix}`});
            }
        }
    }

    static style = {
        graphButton: {
            self: {
                borderRadius: 2
            }
        },
        selectedGraphButton: {
            self: {
                backgroundColor: Styles.accentColor,
            },
            text: {
                color: Styles.whiteColor,
                fontSize: 12
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
                fontSize: 12,
            }
        }
    };

    getGraphStyle(state) {
        return this.state.selectedGraph === state ? GrowthChartView.style.selectedGraphButton : GrowthChartView.style.unselectedGraphButton;
    }

    getLegendLabel() {
        return this.states.weightForAge === this.state.selectedGraph ? "Weight" : "Height";
    }

    getAxisTitles() {
        if (this.state.selectedGraph === this.states.weightForAge) {
            return { xAxisTitle: "Age (completed months)", yAxisTitle: "Weight (kgs)" };
        } else if (this.state.selectedGraph === this.states.heightForAge) {
            return { xAxisTitle: "Age (completed months)", yAxisTitle: "Length/Height (cms)" };
        } else if (this.state.selectedGraph === this.states.weightForHeight) {
            return { xAxisTitle: "Length/Height (cms)", yAxisTitle: "Weight (kgs)" };
        }
        return { xAxisTitle: "", yAxisTitle: "" };
    }

    render() {
        const { xAxisTitle, yAxisTitle } = this.getAxisTitles();
        const legend = {
            enabled: true,
            textColor: processColor('red'),
            textSize: 12,
            position: 'BELOW_CHART_LEFT',
            form: 'SQUARE',
            formSize: 14,
            xEntrySpace: 10,
            yEntrySpace: 5,
            formToTextSpace: 5,
            wordWrapEnabled: true,
            maxSizePercent: 0.5,
            custom: {
                colors: [
                    processColor('black'),
                    processColor('green'),
                    processColor("orange"),
                    processColor("red"),
                ],
                labels: [
                    this.I18n.t(this.getLegendLabel()),
                    this.I18n.t('Grade 1'),
                    this.I18n.t('Grade 2'),
                    this.I18n.t('Grade 3'),
                ],
            },
        };

        const marker = {
            enabled: true,
            markerColor: processColor('white'),
            textColor: processColor('black'),
            markerFontSize: 18,
        };

        const styles = StyleSheet.create({
            chartContainer: {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 1,
                justifyContent: 'center',
                alignContent: 'center',
            },
            yAxisTitle: {
                flexWrap: 'nowrap',
                flexDirection: 'column',
                transform: [{ rotate: '-90deg'},{ scale:10}],
                fontSize: 1.2,
                textAlign: 'center',
                padding:2
            },
            chartWrapper: {
                flex: 1,
                justifyContent: 'center',
            },
            chart: {
                flex: 1
            },
            xAxisTitle: {
                textAlign: 'center',
                fontSize: 16,
                paddingVertical: 5,
            },
        });

        const wfaStyle = this.getGraphStyle(this.states.weightForAge);
        const hfaStyle = this.getGraphStyle(this.states.heightForAge);
        const wfhStyle = this.getGraphStyle(this.states.weightForHeight);
        return (
            <CHSContainer>
                <View style={{ flex: 1, paddingHorizontal: 8, flexDirection: 'column' }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            paddingTop: 4,
                            paddingHorizontal: 8,
                            justifyContent: 'space-between',
                        }}
                    >
                        <Button
                            style={[GrowthChartView.style.graphButton.self, wfaStyle.self]}
                            _text={wfaStyle.text}
                            onPress={() => this.onGraphSelected(this.states.weightForAge)}>
                            {this.I18n.t(this.states.weightForAge)}
                        </Button>

                        <Button
                            style={[GrowthChartView.style.graphButton.self, hfaStyle.self]}
                            _text={hfaStyle.text}
                            onPress={() => this.onGraphSelected(this.states.heightForAge)}>
                            {this.I18n.t(this.states.heightForAge)}
                        </Button>

                        <Button
                            style={[GrowthChartView.style.graphButton.self, wfhStyle.self]}
                            _text={wfhStyle.text}
                            onPress={() => this.onGraphSelected(this.states.weightForHeight)}>
                            {this.I18n.t(this.states.weightForHeight)}
                        </Button>
                    </View>

                    <Text style={[Styles.formGroupLabel, { paddingLeft: 4}]}>{this.I18n.t(this.state.title)}</Text>

                    <View style={styles.chartContainer}>
                        <Text style={styles.yAxisTitle}>{yAxisTitle}</Text>
                        <View style={styles.chartWrapper}>
                            <LineChart
                                style={styles.chart}
                                data={this.state.data}
                                chartDescription={{ text: '' }}
                                legend={legend}
                                marker={marker}
                                drawGridBackground={true}
                                borderColor={processColor("red")}
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
                                keepPositionOnRotation={false}
                                xAxis={{ position: 'BOTTOM', labelCount: 5}}
                                ref="chart"
                            />
                            <Text style={styles.xAxisTitle}>{xAxisTitle}</Text>
                        </View>
                    </View>
                </View>
            </CHSContainer>
        );
    }
}

export default GrowthChartView;
