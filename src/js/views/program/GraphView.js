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
        graphs: React.PropTypes.array.required
    };

    renderStack(graph) {
        return (
            <VictoryStack>
                {_.map(graph.data, (data) => (<VictoryLine data={data}/>))}
            </VictoryStack>
        )
    }

    render() {
        return (
            <Container theme={themes} style={{backgroundColor: Colors.BlackBackground}}>
                <Content>
                    <View>
                        {_.map(this.props.graphs, (graph) => this.renderStack(graph))}
                    </View>
                </Content>
            </Container>
        );
    }

}
export default GraphView;
