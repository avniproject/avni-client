import React, { Component } from 'react';
import { Image, Text, View, TextInput, TouchableOpacity } from 'react-native';
import Colors from './views/primitives/Colors';
const App = require('./App').default;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getJSON } from './framework/http/requests';

class ServerUrlConfiguration extends Component {
    constructor(props) {
        super(props);
        this.state = {
            serverUrl: '',
            isValidUrl: true,
            isURLInitialised: false,
            isLoading: false,
            isVerifying: false,
        };
    }

    async componentDidMount() {
        this.setState({ isLoading: true });
        if (!_.isNil(await AsyncStorage.getItem('serverUrl'))) {
            this.setState({
                isURLInitialised: true
            })
        }
        this.setState({ isLoading: false });
    }

    isUrlValid = async (url) => {
        const urlRegex = /^(https?:\/\/)?(?!www\.)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
        const ipRegex = /^(https?:\/\/)?(\d{1,3}\.){3}\d{1,3}:\d{1,5}$/;
        if (urlRegex.test(url) || ipRegex.test(url)) {
            return getJSON(url + "/idp-details", true).then((idpDetails) => {
                return true;
            }).catch((error) => {
                return false;
            });
        }
        else {
            return false;
        }

    };

    handleUrlChange = (text) => {
        this.setState({ serverUrl: text, isValidUrl: true });
    };

    handleSubmit = async () => {
        this.setState({ isVerifying: true });
        const lowerCaseUrl = this.state.serverUrl.replace(/^https/i, 'https');
        if (await this.isUrlValid(lowerCaseUrl)) {
            this.storeServerUrl(lowerCaseUrl);
            this.setState({ isURLInitialised: true });
        } else {
            this.setState({ isValidUrl: false });
        }
        this.setState({ isVerifying: false });
    };

    storeServerUrl = async (url) => {
        try {
            await AsyncStorage.setItem('serverUrl', url);
            console.log('Server URL stored successfully');
        } catch (error) {
            console.error('Error storing server URL:', error);
        }
    };

    renderURLConfigView = () => {
        return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Image source={{ uri: 'asset:/logo.png' }} style={{ height: 120, width: 120, alignSelf: 'center' }} resizeMode={'center'} />

            <View style={{ paddingHorizontal: 48, marginTop: 20, width: '80%' }}>
                <TextInput
                    value={this.state.serverUrl}
                    onChangeText={this.handleUrlChange}
                    placeholder="Enter Server URL"
                    style={{
                        borderBottomWidth: 1,
                        borderColor: Colors.primaryColor,
                        paddingVertical: 8,
                        fontSize: 16,
                    }}
                />

                {!this.state.isValidUrl && (
                    <Text style={{ color: Colors.ValidationError, fontSize: 14, marginTop: 10 }}>Please enter a valid server URL.</Text>
                )}

                {this.state.isVerifying && <Text style={{ color: Colors.Complimentary, fontSize: 14, marginTop: 10 }}>Validating URL....</Text>}

                <TouchableOpacity
                    onPress={() => {
                        this.handleSubmit();
                    }}
                    style={{
                        marginTop: 20,
                        backgroundColor: this.state.serverUrl && this.state.isValidUrl && !this.state.isVerifying ? "#009973" : "gray",
                        paddingVertical: 10,
                        borderRadius: 5,
                        alignItems: 'center',
                    }}
                    disabled={!this.state.serverUrl || !this.state.isValidUrl || this.state.isVerifying}
                >
                    <Text style={{ color: 'white', fontSize: 16 }}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>)
    }

    renderTextView = (text) => {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} >
                <Text>{text}</Text>
            </View>);
    }

    render() {
        if (this.state.isLoading) {
            return this.renderTextView("Loading...");
        }
        if (this.state.isURLInitialised && !this.state.isLoading) {
            return <App />
        }
        if (!this.state.isURLInitialised && !this.state.isLoading) {
            return this.renderURLConfigView();
        }
    }
}

export default ServerUrlConfiguration;