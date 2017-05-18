import {Content, Container, View} from "native-base";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import General from "../../utility/General";
import * as React from "react";
import themes from "../primitives/themes";
import {VictoryScatter, VictoryChart, VictoryLine, VictoryAxis} from "victory-native";
import {Text} from "native-base";
import * as _ from "lodash";
import Fonts from '../primitives/Fonts';
import Colors from "../primitives/Colors";


@Path('/GraphView')
class GraphView extends AbstractComponent {
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
        // <View style={{flexDirection: 'column', flex: 1, alignItems: 'center', marginBottom: 20}} key={index}>
        // <Text style={{fontSize: Fonts.Large, fontWeight: 'bold', color: Colors.InputNormal}}>
        //     {title}
        // </Text>
        return (
            <View key={index} style={{flexDirection: 'column', flex: 1, alignItems: 'center', marginBottom: 20}}>
                <VictoryChart>
                    <VictoryAxis orientation="bottom" label={graph.xAxisTitle}/>
                    <VictoryAxis dependentAxis={true} orientation="left" label="bar"/>
                    {_.map(gridLines, (data, idx) => (
                        <VictoryLine data={data} key={idx} style={{data: {stroke: "tomato", opacity: 0.2}}}/>))}
                    <VictoryLine data={data} key={dataIndex}/>
                </VictoryChart>
                <Text style={{fontSize: Fonts.Large, fontWeight: 'bold', color: Colors.InputNormal}}> {title} </Text>
            </View> )
    }

    render() {
        General.logDebug("GraphView", 'render');
        return (
            <Container theme={themes} style={{backgroundColor: 'white'}}>
                <Content>
                    <View style={{flexDirection: 'column', flex: 1}}>
                        {_.map(this.props.params.graphs, (graph, index) => this.renderStack(graph, index))}
                    </View>
                </Content>
            </Container>
        );
    }

}
export default GraphView;
