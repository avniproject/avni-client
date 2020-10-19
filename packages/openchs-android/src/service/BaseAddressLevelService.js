import BaseService from './BaseService.js'
import _ from 'lodash';

class BaseAddressLevelService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    maxLevel() {
        let sortedByLevels = this.findAll(this.getSchema()).filtered('voided = false').sorted('level', true)[0];
        return _.defaultTo(sortedByLevels, {level: 0}).level;
    }

    minLevel() {
        return this.findAll(this.getSchema()).filtered('voided = false').sorted('level', false)[0].level;
    }

    minTypeUUIDs() {
        const minLevel = this.minLevel();
        return [...this.findAll(this.getSchema()).filtered(`voided = false and level = ${minLevel}`)
            .filtered('TRUEPREDICATE DISTINCT(typeUuid)')
            .map(al => al.typeUuid)
            .map(_.identity)];
    }

    maxTypeUUID() {
        return  this.findAll(this.getSchema()).filtered('voided = false').sorted('level', true)[0].typeUuid;
    }

    getAllWithTypeUUID(typeUUID) {
        return [...this.findAllByCriteria(`typeUuid = '${typeUUID}' AND voided = false`, this.getSchema()).map(_.identity)];
    }

    getAllAtLevel(level) {
        return [...this.findAllByCriteria(`level = ${level} AND voided = false`, this.getSchema()).map(_.identity)];
    }

    getAllAtLevelWithParent(level, parentUUID) {
        return [...this.findAllByCriteria(`level = ${level} AND parentUuid = '${parentUUID}' AND voided = false`,
            this.getSchema()).map(_.identity)];
    }

    highestLevel() {
        const maxLevel = this.maxLevel();
        return this.getAllAtLevel(maxLevel);
    }

    isRoot(parent) {
        return parent.level === this.maxLevel();
    }

    lowestLevelAmongst(addressLevels) {
        return _.minBy([...addressLevels], al => al.level);
    }

    getParentsOfLeaf(leaf, maxLevelTypeUUID) {
        if (this.isRoot(leaf) || leaf.typeUuid === maxLevelTypeUUID) {
            return [];
        } else {
            const parents = this.getParent(leaf.parentUuid);
            let lowestLevelParent = this.lowestLevelAmongst(parents);
            return this.getParentsOfLeaf(lowestLevelParent, maxLevelTypeUUID).concat([lowestLevelParent]);
        }
    }

    getParent(parentUUID) {
        return this.findAllByCriteria(`uuid = '${parentUUID}'`);
    }

    getChildrenParent(parentUUID) {
        if (_.isNil(parentUUID)) return [];
        return [...this.findAllByCriteria(`parentUuid = '${parentUUID}' AND voided = false`, this.getSchema())
            .map(_.identity)];
    }

    isLeaf(child) {
        return child.level === this.minLevel();
    }

    getLeavesOfParent(parent) {
        if (this.isLeaf(parent)) {
            return [parent];
        }
        const children = this.getChildrenParent(parent.uuid);
        if (_.isEmpty(children)) {
            return [];
        }
        else if (this.isLeaf(_.first(children))) {
            return children;
        }
        return _.flatten(children.map(c => this.getLeavesOfParent(c)));
    }

    getDescendantsOfParent(parentUuid, minLevelTypeUUIDs) {
        const children = this.getChildrenParent(parentUuid);
        return !_.isEmpty(minLevelTypeUUIDs) ? this.filterRequiredDescendants(children, minLevelTypeUUIDs) : children;
    }

    filterRequiredDescendants(allChildren, minLevelTypeUUIDs) {
        const minLevel = this.getMinLevelFromTypeUUIDs(minLevelTypeUUIDs);
        const childrenWithMinLevel = allChildren.filter(({typeUuid})  => _.includes(minLevelTypeUUIDs, typeUuid));
        return childrenWithMinLevel.length > 0 ? childrenWithMinLevel : _.reject(allChildren,({level})  => level <= minLevel);
    }

    getMinLevelFromTypeUUIDs(minLevelTypeUUIDs) {
        const  query = minLevelTypeUUIDs.map(uuid => `typeUuid = '${uuid}'`).join(' OR ');
        return _.minBy([...this.findAll(this.getSchema()).filtered(`voided = false and (${query})`)
            .filtered('TRUEPREDICATE DISTINCT(level)')
            .map(al => al.level)
            .map(_.identity)]);
    }

    isOnLowestLevel(lowestSelectedAddresses, minLevelTypeUUIDs) {
        if (!_.isEmpty(minLevelTypeUUIDs)) {
            return _.every(lowestSelectedAddresses, ({typeUuid}) => _.includes(minLevelTypeUUIDs, typeUuid));
        }
        return _.every(lowestSelectedAddresses, (al) => _.isEmpty(this.getChildrenParent(al.uuid)));
    }
}

export default BaseAddressLevelService;
