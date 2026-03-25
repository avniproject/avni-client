import NetInfo from "@react-native-community/netinfo";

const UNKNOWN_CONNECTION_INFO = Object.freeze({
    type: "Unknown",
    effectiveType: "Unknown",
    isConnected: false,
    isInternetReachable: false,
    isWifiEnabled: false,
    details: {}
});

const CONNECTION_INFO_TIMEOUT_IN_MS = 3000;

const getUnknownConnectionInfo = () => ({...UNKNOWN_CONNECTION_INFO});

const getConnectionInfo = async (timeoutInMs = CONNECTION_INFO_TIMEOUT_IN_MS) => {
    let timeoutId;

    try {
        const timedOutConnectionInfo = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve(getUnknownConnectionInfo()), timeoutInMs);
        });

        const connectionInfo = await Promise.race([
            NetInfo.fetch(),
            timedOutConnectionInfo
        ]);

        return {
            ...getUnknownConnectionInfo(),
            ...connectionInfo
        };
    } catch (error) {
        return getUnknownConnectionInfo();
    } finally {
        timeoutId && clearTimeout(timeoutId);
    }
};

export {
    CONNECTION_INFO_TIMEOUT_IN_MS,
    getConnectionInfo,
    getUnknownConnectionInfo
};
