import {Documentation, DocumentationItem} from "openchs-models";
import General from "../utility/General";

class RealmExamples {
    //yes
    static doesSaveCascadesForDisconnectedGraph(db) {
        this.parentChildWithCyclicRelationshipSaveTogether(db);
        const documentation = db.objects(Documentation.schema.name)[0];

        const disconnectedDocumentation = new Documentation();
        disconnectedDocumentation.uuid = documentation.uuid;
        disconnectedDocumentation.name = "doesSaveCascades";

        const disconnectedDocumentationItem = new DocumentationItem();
        disconnectedDocumentationItem.uuid = documentation.documentationItems[0].uuid;
        disconnectedDocumentationItem.content = "doesSaveCascades-I";
        disconnectedDocumentationItem.documentation = disconnectedDocumentation;
        disconnectedDocumentation.documentationItems = [disconnectedDocumentationItem];

        db.write(() => db.create(Documentation.schema.name, disconnectedDocumentation, true));

        const documentationItems = db.objects(DocumentationItem.schema.name);
        documentationItems.forEach((x) => console.log("doesSaveCascades", x.content));
    }

    static parentChildSaveTogether_RangeErrorWith11ButCrashesWith10(db) {
        if (db.objects(Documentation.schema.name).length === 1) return;

        const documentation = new Documentation();
        documentation.name = "foo";
        documentation.uuid = General.randomUUID();

        const documentationItem = new DocumentationItem();
        documentationItem.content = "bar";
        documentationItem.documentation = documentation;
        documentationItem.uuid = General.randomUUID();

        documentation.documentationItems = [documentationItem];

        db.write(() => db.create(Documentation.schema.name, documentation, true));
    }

    static parentChildWithCyclicRelationshipSaveTogether(db) {
        //1. save parent. 2. add child
        if (db.objects(Documentation.schema.name).length === 1) return;

        const documentation = new Documentation();
        documentation.name = "foo";
        documentation.uuid = General.randomUUID();
        db.write(() => db.create(Documentation.schema.name, documentation, true));

        const documentationItem = new DocumentationItem();
        documentationItem.content = "bar";
        documentationItem.uuid = General.randomUUID();
        // db.write(() => db.create(DocumentationItem.schema.name, documentation, true));

        documentation.documentationItems = [documentationItem];
        db.write(() => db.create(Documentation.schema.name, documentation, true));
    }

    static loadParentChild(db) {
        return db.objects(Documentation.schema.name);
    }
}

export default RealmExamples;
