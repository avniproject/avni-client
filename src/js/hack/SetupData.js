import AddressLevel from "../models/AddressLevel";

class SetupData {
    static setup(refDataService) {
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Jinjgaon", 1));
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Nijhma", 1));
        refDataService.save(AddressLevel.schema.name, AddressLevel.create("Naya Gaon", 1));
    }
}

export default SetupData;