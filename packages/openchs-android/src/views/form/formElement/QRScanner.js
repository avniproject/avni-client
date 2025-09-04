import React, { useState, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    Camera,
    useCameraDevice,
    useCodeScanner,
} from "react-native-vision-camera";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../primitives/Colors";

const QRScanner = (props) => {
    const [hasPermission, setHasPermission] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const device = useCameraDevice("back");
    
    const codeScanner = useCodeScanner({
        codeTypes: ["qr", "ean-13"],
        onCodeScanned: (codes) => {
            if (codes && codes.length > 0) {
                console.log(`QR Code scanned:`, codes[0].value);
                props.onRead(codes[0].value);
            }
        },
    });

    useEffect(() => {
        // exception case for device changes
        setRefresh(!refresh);
    }, [device, hasPermission]);

    useEffect(() => {
        const requestCameraPermission = async () => {
            const permission = await Camera.requestCameraPermission();
            console.log("Camera permission:", permission);
            setHasPermission(permission === "granted");
        };

        requestCameraPermission();

        // Auto close after 30 seconds if no scan
        const timeout = setTimeout(() => {
            props.onRead(null);
        }, 30 * 1000);

        return () => clearTimeout(timeout);
    }, []);

    if (device == null || !hasPermission) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="camera-off" size={64} color={Colors.ValidationError} />
                <Text style={styles.errorText}>
                    Camera not available or permission not granted
                </Text>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => props.onRead(null)}
                >
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                codeScanner={codeScanner}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
            />
            
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => props.onRead(null)}
                >
                    <Icon name="arrow-left" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan QR Code</Text>
            </View>

            {/* Scanning overlay */}
            <View style={styles.overlay}>
                <View style={styles.scanArea}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
                <Text style={styles.instructionText}>
                    Point your camera at a QR code
                </Text>
            </View>

            {/* Footer with close button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => props.onRead(null)}
                >
                    <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    errorContainer: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 32,
        color: Colors.ValidationError,
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingBottom: 10,
        paddingHorizontal: 16,
        zIndex: 1,
    },
    headerButton: {
        padding: 8,
        marginRight: 16,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanArea: {
        width: 250,
        height: 250,
        position: 'relative',
    },
    corner: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderColor: Colors.AccentColor,
        borderWidth: 3,
    },
    topLeft: {
        top: 0,
        left: 0,
        borderBottomWidth: 0,
        borderRightWidth: 0,
    },
    topRight: {
        top: 0,
        right: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
        borderTopWidth: 0,
        borderRightWidth: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
    },
    instructionText: {
        color: 'white',
        fontSize: 16,
        marginTop: 32,
        textAlign: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
    },
    closeButton: {
        backgroundColor: Colors.AccentColor,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default QRScanner;
