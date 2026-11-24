import React from "react";
import {ActivityIndicator, View} from "react-native";
import CHSContainer from "./CHSContainer";
import AppHeader from "./AppHeader";

export default function FullScreenLoader({title, onBack, backgroundColor}) {
    return (
        <CHSContainer style={backgroundColor ? {backgroundColor} : undefined}>
            {title != null && <AppHeader title={title} func={onBack}/>}
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <ActivityIndicator size="large"/>
            </View>
        </CHSContainer>
    );
}
