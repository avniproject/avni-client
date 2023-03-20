import {EntityQueue} from 'openchs-models';

export default class TestEntityQueueFactory {
    static create({entity: entity}) {
        const entityQueue = new EntityQueue();
        entityQueue.entity = entity;
        return entityQueue;
    }
}
