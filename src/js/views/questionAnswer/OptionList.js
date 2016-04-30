import React, {Component, View, StyleSheet, ListView} from 'react-native';
import AnswerOption from './AnswerOption.js';

class OptionList extends Component {

    static propTypes = {
        answer: React.PropTypes.object.isRequired,
    };

    static initialDataSource = () =>
        new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

    state = {
        dataSource: OptionList.initialDataSource().cloneWithRows(this.props.answer.choices),
    };

    static styles = StyleSheet.create({
        list: {
            justifyContent: 'center',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
    });

    render() {
        var temp = function (selectedChoice) {
            return function () {
                return this.props.answer.match(selectedChoice);
            }.bind(this);
        }.bind(this);
        return (
            <View>
                <ListView
                    contentContainerStyle={OptionList.styles.list}
                    dataSource={this.state.dataSource}
                    renderRow={(rowItem) => <AnswerOption choice={rowItem} match={temp(rowItem)}/>}
                />
            </View>
        );
    }
}

export default OptionList;