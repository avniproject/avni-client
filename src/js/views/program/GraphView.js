import {Content, Container, View} from "native-base";
import Path from "../../framework/routing/Path";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Colors from "../primitives/Colors";
import * as React from "react";
import themes from "../primitives/themes";
import {VictoryLine, VictoryStack} from "victory-native";
import * as _ from "lodash";


@Path('/GraphView')
class GraphView extends AbstractComponent {
    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    renderStack(graph, index) {
        return (
            <VictoryStack key={index}>
                {_.map(graph.data, (data, index) => (<VictoryLine data={data} key={index}/>))}
            </VictoryStack>
        )
    }

    render() {
        return (
            <Container theme={themes} style={{backgroundColor: 'white'}}>
                <Content>
                    <View>
                        {_.map(this.props.params.graphs, (graph, index) => this.renderStack(graph, index))}
                    </View>
                </Content>
            </Container>
        );
    }

}
export default GraphView;
