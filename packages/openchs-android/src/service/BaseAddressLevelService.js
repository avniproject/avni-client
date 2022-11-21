import BaseService from './BaseService.js'
import _ from 'lodash';

class BaseAddressLevelService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getAllRootParents() {
        return this.findAll(this.getSchema())
            .filtered('voided = false and locationMappings.@count == 0')
            .filtered('TRUEPREDICATE DISTINCT(typeUuid)');
    }

    maxLevels() {
        return [...this.getAllRootParents().map(al => al.level).map(_.identity)];
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
        return [...this.findAllByCriteria(`typeUuid = '${typeUUID}' AND voided = false`, this.getSchema())];
    }

    getAllAtLevel(levelQuery) {
        return [...this.findAllByCriteria(`${levelQuery} AND voided = false`, this.getSchema()).sorted('level', true)];
    }

    getAllAtLevelWithParent(level, parentUUID) {
        return [...this.findAllByCriteria(`level = ${level} AND parentUuid = '${parentUUID}' AND voided = false`,
            this.getSchema())];
    }

    highestLevel(minLevelTypeUUIDs) {
        const maxLevels = this.maxLevels();
        const levelQuery = _.isEmpty(maxLevels) ? 'level = 0' : _.map(maxLevels, l => `level = ${l}`).join(" or ");
        const highestAddressLevels = this.getAllAtLevel(`(${levelQuery})`);
        return _.isEmpty(minLevelTypeUUIDs) ? highestAddressLevels : this.filterTheHierarchy(highestAddressLevels, minLevelTypeUUIDs);
    }

    filterTheHierarchy(highestAddressLevels, minLevelTypeUUIDs) {
        return _.filter(highestAddressLevels, al => this.isTypeUUIDPresent(al, minLevelTypeUUIDs))
    }

    isTypeUUIDPresent(addressLevel, levelTypeUUIDs) {
        if (_.includes(levelTypeUUIDs, addressLevel.typeUuid)) return true;
        else {
            const childrenParent = this.getChildrenParent(addressLevel.uuid);
            if (_.isEmpty(childrenParent)) return false;
            else return this.isTypeUUIDPresent(_.head(childrenParent), levelTypeUUIDs);
        }
    }

    isRoot(parent) {
        return _.includes(this.maxLevels(), parent.level);
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
        return [...this.findAllByCriteria(`parentUuid = '${parentUUID}' AND voided = false`, this.getSchema())];
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
