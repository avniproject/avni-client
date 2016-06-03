import React, { StyleSheet } from 'react-native';

export let Global = StyleSheet.create({
    navButton: {
        backgroundColor: '#FF3823',
        color: '#FFFFFF',
        margin: 2,
        width: 100,
        textAlign: 'center',
        textAlignVertical: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: 22
    },
    navButtonHidden: {
        height: 0
    },
    navButtonVisible: {
        height: 44
    },
    mainSection: {
        marginTop: 15,
        paddingLeft: 10,
        paddingRight: 10,
        flex: 1,
        flexDirection: 'column'
    }
});
