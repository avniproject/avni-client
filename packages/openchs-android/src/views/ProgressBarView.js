import {ProgressBarAndroid, Text, View} from "react-native";
import Fonts from "./primitives/Fonts";
import React from "react";
import Colors from "./primitives/Colors";


class ProgressBarView extends React.Component {
    static propType = {
        progressBar: React.PropTypes.func
    };

    constructor(props) {
        super(props);
        this.state = {value: 0};
        this.props.progressBar(this);
    }

    update(value){
        this.setState({value})
    }

    render() {
        return (<View>
                <ProgressBarAndroid styleAttr="Horizontal" progress={this.state.value}
                                    indeterminate={false} color="white"/>
                <Text style={[{color: Colors.TextOnPrimaryColor}, Fonts.typography("paperFontSubhead")]}>
                    Percentage done : {((this.state.value) * 100).toFixed(2)}%
                </Text>
            </View>
        );
    }
}

export default ProgressBarView
