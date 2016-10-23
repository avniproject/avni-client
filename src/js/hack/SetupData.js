import AddressLevel from "../models/AddressLevel";
import ReferenceDataService from "../service/ReferenceDataService";
class SetupData {
    setup(context) {
        var refDataService = context.getService(ReferenceDataService);
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Jinjgaon", 1));
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Nijhma", 1));
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Naya Gaon", 1));
    }
}

export default SetupData;