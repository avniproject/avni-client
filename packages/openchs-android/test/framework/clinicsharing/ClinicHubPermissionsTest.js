import {PermissionsAndroid} from "react-native";
import {ClinicRole, clinicHubPermissions, requestClinicHubPermissions} from "../../../src/framework/clinicsharing/ClinicHubPermissions";

const P = PermissionsAndroid.PERMISSIONS;
const {GRANTED, DENIED} = PermissionsAndroid.RESULTS;

describe("ClinicHubPermissions", () => {
    it("asks a hub for nearby Wi-Fi devices from Android 13, and for precise with approximate location before it", () => {
        expect(clinicHubPermissions(ClinicRole.hub, 33)).toEqual([P.NEARBY_WIFI_DEVICES, P.POST_NOTIFICATIONS]);
        expect(clinicHubPermissions(ClinicRole.hub, 29)).toEqual([P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION]);
    });

    it("asks a phone for the camera as well, to scan", () => {
        expect(clinicHubPermissions(ClinicRole.phone, 35)).toEqual([P.CAMERA, P.NEARBY_WIFI_DEVICES, P.POST_NOTIFICATIONS]);
        expect(clinicHubPermissions(ClinicRole.phone, 26)).toEqual([P.CAMERA, P.ACCESS_FINE_LOCATION, P.ACCESS_COARSE_LOCATION]);
    });

    it("asks both a hub and a phone for notifications from Android 13, where they need asking, so the clinic service's notification shows", () => {
        expect(clinicHubPermissions(ClinicRole.hub, 34)).toContain(P.POST_NOTIFICATIONS);
        expect(clinicHubPermissions(ClinicRole.phone, 34)).toContain(P.POST_NOTIFICATIONS);
        expect(clinicHubPermissions(ClinicRole.phone, 32)).not.toContain(P.POST_NOTIFICATIONS);
    });

    it("lets a phone join and a hub start without notifications", async () => {
        jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({[P.CAMERA]: GRANTED, [P.NEARBY_WIFI_DEVICES]: GRANTED, [P.POST_NOTIFICATIONS]: DENIED});
        await expect(requestClinicHubPermissions(ClinicRole.phone, 34)).resolves.toEqual({granted: true, denied: []});
    });

    it("reports what was refused", async () => {
        jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({[P.CAMERA]: GRANTED, [P.NEARBY_WIFI_DEVICES]: DENIED});
        await expect(requestClinicHubPermissions(ClinicRole.phone, 34)).resolves.toEqual({granted: false, denied: [P.NEARBY_WIFI_DEVICES]});
    });

    it("needs precise location below Android 13: approximate alone is not enough", async () => {
        jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({[P.ACCESS_FINE_LOCATION]: DENIED, [P.ACCESS_COARSE_LOCATION]: GRANTED});
        await expect(requestClinicHubPermissions(ClinicRole.hub, 31)).resolves.toEqual({granted: false, denied: [P.ACCESS_FINE_LOCATION]});
    });

    it("does not count approximate location against a phone that has precise location", async () => {
        jest.spyOn(PermissionsAndroid, "requestMultiple").mockResolvedValue({[P.CAMERA]: GRANTED, [P.ACCESS_FINE_LOCATION]: GRANTED, [P.ACCESS_COARSE_LOCATION]: DENIED});
        await expect(requestClinicHubPermissions(ClinicRole.phone, 28)).resolves.toEqual({granted: true, denied: []});
    });
});
