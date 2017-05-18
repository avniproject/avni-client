import {Content, Container, View} from "native-base";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import * as React from "react";
import themes from "../primitives/themes";
import {VictoryChart, VictoryLine, VictoryAxis} from "victory-native";
import {Text} from "native-base";
import * as _ from "lodash";
import Fonts from '../primitives/Fonts';
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader"


@Path('/GrowthChartView')
class GrowthChartView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    renderStack(graph, index) {
        const title = graph.title;
        const gridLines = _.dropRight(graph.data);
        const data = _.last(graph.data);
        const dataIndex = graph.data.length - 1;
        const colors = ["red", "orange", "green", "orange", "red"]
        return (
            <View key={index} style={{flexDirection: 'column', flex: 1, alignItems: 'center', marginBottom: 20}}>
                <VictoryChart padding={40}>
                    <VictoryAxis orientation="bottom" label={graph.xAxisTitle}/>
                    <VictoryAxis dependentAxis={true} orientation="left" label="bar"/>
                    {_.map(gridLines, (data, idx) => (
                        <VictoryLine data={data} key={idx} style={{data: {stroke: colors[idx], opacity: 0.2}}}/>))}
                    <VictoryLine data={data} key={dataIndex} labels={(datum) => datum.y}/>
                </VictoryChart>
                <Text style={{fontSize: Fonts.Large, fontWeight: 'bold', color: Colors.InputNormal}}> {title} </Text>
            </View> )
    }

    render() {
        General.logDebug("GrowthChartView", 'render');
        const individualName = this.props.params.individualName;
        return (
            <Container theme={themes} style={{backgroundColor: 'white'}}>
                <Content>
                    <AppHeader title={`${individualName} - Growth Chart`}/>
                    <View style={{flexDirection: 'column', flex: 1}}>
                        {_.map(this.props.params.graphs, (graph, index) => this.renderStack(graph, index))}
                    </View>
                </Content>
            </Container>
        );
    }

}
export default GrowthChartView;
