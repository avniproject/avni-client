import RealmRepository from './RealmRepository';
import TransactionManager from './TransactionManager';
import IndividualRepository from './IndividualRepository';
import ConceptRepository from './ConceptRepository';
import GenderRepository from './GenderRepository';
import AddressLevelRepository from './AddressLevelRepository';
import FormElementRepository from './FormElementRepository';
import {Individual, Concept, Gender, AddressLevel, FormElement} from 'openchs-models';

class RepositoryFactory {
    constructor(db) {
        this.db = db;
        this._cache = new Map();
        this._transactionManager = new TransactionManager(db);
        this._registerPilotRepositories(db);
    }

    _registerPilotRepositories(db) {
        this._cache.set(Individual.schema.name, new IndividualRepository(db));
        this._cache.set(Concept.schema.name, new ConceptRepository(db));
        this._cache.set(Gender.schema.name, new GenderRepository(db));
        this._cache.set(AddressLevel.schema.name, new AddressLevelRepository(db));
        this._cache.set(FormElement.schema.name, new FormElementRepository(db));
    }

    getRepository(schemaName) {
        if (!this._cache.has(schemaName)) {
            this._cache.set(schemaName, new RealmRepository(this.db, schemaName));
        }
        return this._cache.get(schemaName);
    }

    registerRepository(schemaName, repositoryInstance) {
        this._cache.set(schemaName, repositoryInstance);
    }

    get transactionManager() {
        return this._transactionManager;
    }

    updateDatabase(db) {
        this.db = db;
        this._transactionManager.updateDatabase(db);
        this._cache.forEach(repository => repository.updateDatabase(db));
    }
}

export default RepositoryFactory;
