import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import General from "../utility/General";
import fs from "react-native-fs";
import {
  Concept,
  EncounterType,
  Form, FormElement,
  FormElementGroup, Groups,
  Individual,
  LocationHierarchy,
  Observation, Point,
  SubjectType
} from "openchs-models";

const dummyDate = new Date();
const dummyText = "dummy";
const dummyValueJSON = '{"value":"dummy","datatype":"Text","answer":"dummy"}'
const dummyDouble = 0.0;

const anonymizationConfig = [
  {
    "schemaName": Individual.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      },
      {
        "property": "firstName",
        "value": dummyText
      },
      {
        "property": "middleName",
        "value": dummyText
      },
      {
        "property": "lastName",
        "value": dummyText
      },
      {
        "property": "dateOfBirth",
        "value": dummyDate
      },
    ]
  },
  {
    "schemaName": Concept.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": Form.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": FormElementGroup.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": FormElement.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": EncounterType.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": SubjectType.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": LocationHierarchy.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": Groups.schema.name,
    "fields": [
      {
        "property": "name",
        "value": dummyText
      }
    ]
  },
  {
    "schemaName": Point.schema.name,
    "fields": [
      {
        "property": "x",
        "value": dummyDouble
      },
      {
        "property": "y",
        "value": dummyDouble
      }
    ]
  },
  {
    "schemaName": Observation.schema.name,
    "batch": true,
    "fields": [
      {
        "property": "valueJSON",
        "value": dummyValueJSON
      }
    ]
  }
]
@Service("anonymizeRealmService")
export default class AnonymizeRealmService extends BaseService {
  constructor( db, context ) {
    super(db, context);
  }

  copyDB( config ) {
    General.logInfo("AnonymizeRealmService", `Making copy of DB at: ${config.path}`);
    this.db.writeCopyTo(config);
    General.logInfo("AnonymizeRealmService", `Copy Done`);
  }

  anonymizeDB( config ) {
    General.logInfo("AnonymizeRealmService", `Anonymizing DB at: ${config.path}`);
    let newDB;
    try {
      newDB = new Realm(config)
      anonymizationConfig.map(config => {
        config.batch ? this.anonymizeSchemaBatched(newDB, config.schemaName, config.fields, config.batchSize) :
          this.anonymizeSchema(newDB, config.schemaName, config.fields)
      })
    } catch (e) {
      General.logError("AnonymizeRealmService", `Error while Anonymizing DB: ${e}`)
    } finally {
      newDB && newDB.close();
      General.logInfo("AnonymizeRealmService", `Closed anonymized DB`);
    }
  }

  anonymizeSchema( newDB, schemaName, anonymizationFields ) {
    General.logInfo("AnonymizeRealmService", `Anonymizing ${schemaName}`);
    const objects = newDB.objects(schemaName)

    newDB.beginTransaction()
    _.forEach(anonymizationFields, ( field ) => {
      objects.update(field.property, field.value);
    })
    newDB.commitTransaction()
  }

  anonymizeSchemaBatched( newDB, schemaName, anonymizationFields, batchSize = 100000 ) {
    General.logInfo("AnonymizeRealmService", `Anonymizing ${schemaName} in batches of sizes ${batchSize}.`);
    const objects = newDB.objects(schemaName)
    let i = 0;
    let objectsInMemory = []
    _.forEach(objects, ( myObject ) => {
      objectsInMemory.push(myObject)
      i++
      if (i % batchSize === 0 || i === objects.length) {
        General.logInfo("AnonymizeRealmService", `Anonymizing ${schemaName}. Processed ${i} of ${objects.length}.`);
        newDB.write(() => {
          _.forEach(objectsInMemory, ( objInMem ) => {
            _.forEach(anonymizationFields, ( field ) => {
              objInMem[field.property] = field.value
            })
          })
        })
        objectsInMemory = []
      }
    })
  }

  copyAndAnonymizeDatabase( cb ) {
    General.logInfo("AnonymizeRealmService", "Start Processing");
    const fileName = `anon-${General.getSafeTimeStamp()}.realm`;
    let tempFile = `${fs.DocumentDirectoryPath}/${fileName}`;
    let destFile = `${fs.DocumentDirectoryPath}/anonymized.realm`;
    let config = {
      path: tempFile,
    }
    this.copyDB(config)
    cb(20, "Copy Done")
    this.anonymizeDB(config)
    renameFile(tempFile, destFile)
      .then(
        cb(100, `Anonymization Done. File available at ${destFile}. Use make get_anon_db to fetch.`)
      );
  }
}

export const renameFile = async ( srcFile, destFile ) => {
  await fs.moveFile(srcFile, destFile)
}