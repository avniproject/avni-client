import React, {Component, StyleSheet, Text, Image, View} from 'react-native';

class AppHeader extends Component {
    static propTypes = {
        title: React.PropTypes.string.isRequired
    };

    static styles = StyleSheet.create({
        main: {
            backgroundColor: '#FF8A84',
            height: 60,
            width: 600,
            marginBottom: 10,
            flex: 1,
            flexDirection: 'row'
        },
        icon: {
            flex: 0.1
        },
        header: {
            color: '#FFFFFF',
            textAlignVertical: 'center',
            fontWeight: 'bold',
            fontSize: 26,
            width: 50,
            marginLeft: 100,
            flex: 0.9
        }
    });

    render() {
        return (
            <View style={AppHeader.styles.main}>
                <View style={AppHeader.styles.icon}>
                    <Image
                        source={require('../../../../android/app/src/main/res/mipmap-mdpi/MentalState-48.png')}
                        />
                </View>
                <Text style={AppHeader.styles.header}>{this.props.title}</Text>
            </View>
        );
    }
}

export default AppHeader;
