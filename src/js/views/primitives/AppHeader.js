import React, {Component, StyleSheet, Text} from 'react-native';

class AppHeader extends Component {
    static propTypes = {
        title: React.PropTypes.string.isRequired
    };

    static styles = StyleSheet.create({
        header: {
            backgroundColor: '#F44336',
            color: '#FFFFFF',
            height: 30,
            width: 1000,
            alignSelf: 'center',
            textAlign: 'center',
            textAlignVertical: 'center',
            marginBottom: 5
        }
    });


    render() {
        return (
            <Text>
                <Text style={AppHeader.styles.header}>{this.props.title}</Text>
            </Text>
        );
    }
}

export default AppHeader;
