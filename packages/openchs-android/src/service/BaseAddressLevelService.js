import BaseService from './BaseService.js'
import _ from 'lodash';
import RealmQueryService from "./query/RealmQueryService";

class BaseAddressLevelService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this._hierarchyCache = null;
    }

    // Lazily build an in-memory lookup of the full address hierarchy.
    // Avoids repeated DB queries during recursive traversal (getDescendantsOfNode, isTypeUUIDPresent).
    // Cache is invalidated on database update (sync).
    _getHierarchyCache() {
        if (this._hierarchyCache) return this._hierarchyCache;

        const allAddresses = this.findAll(this.getSchema()).filtered('voided = false');
        const childrenByParent = new Map(); // parentUuid → [addressLevel, ...]
        const byUuid = new Map();

        for (let i = 0; i < allAddresses.length; i++) {
            const al = allAddresses[i];
            byUuid.set(al.uuid, al);
            const parentKey = al.parentUuid || '__root__';
            if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
            childrenByParent.get(parentKey).push(al);
        }

        this._hierarchyCache = {childrenByParent, byUuid};
        return this._hierarchyCache;
    }

    clearHierarchyCache() {
        this._hierarchyCache = null;
    }

    updateDatabase(db) {
        super.updateDatabase(db);
        this.clearHierarchyCache();
    }

    getAllRootParents() {
        return this.repository.query()
            .nonVoided()
            .sizeEq('locationMappings', 0)
            .distinct('typeUuid')
            .all();
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
        return this.findAll(this.getSchema()).filtered('voided = false').sorted('level', true)[0].typeUuid;
    }

    getAllWithTypeUUID(typeUUID) {
        return [...this.findAllByCriteria(`typeUuid = '${typeUUID}' AND voided = false`, this.getSchema())];
    }

    getAllAtLevel(levelQuery) {
        const query = _.isEmpty(levelQuery) ? "" : `${levelQuery} AND`;
        return [...this.findAllByCriteria(`${query} voided = false`, this.getSchema()).sorted('level', true)];
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
            const childrenParent = this.getChildren(addressLevel.uuid);
            return !_.isEmpty(childrenParent) && _.some(childrenParent, child => this.isTypeUUIDPresent(child, levelTypeUUIDs));
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
        const cache = this._getHierarchyCache();
        const parent = cache.byUuid.get(parentUUID);
        return parent ? [parent] : [];
    }

    getChildren(parentUUID) {
        if (_.isEmpty(parentUUID)) return [];
        const cache = this._getHierarchyCache();
        return cache.childrenByParent.get(parentUUID) || [];
    }

    isLeaf(child) {
        return child.level === this.minLevel();
    }

    getDescendantsOfNode(node) {
        const children = this.getChildrenOfNode(node);
        return [...children].concat(_.flatten(children.map(c => this.getDescendantsOfNode(c))));
    }

    getChildrenOfNode(node) {
        if (this.isLeaf(node)) {
            return [];
        }

        return this.getChildren(node.uuid);
    }

    getDescendantsOfParent(parentUuid, minLevelTypeUUIDs) {
        const children = this.getChildren(parentUuid);
        return !_.isEmpty(minLevelTypeUUIDs) ? this.filterRequiredDescendants(children, minLevelTypeUUIDs) : children;
    }

    filterRequiredDescendants(allChildren, minLevelTypeUUIDs) {
        const minLevel = this.getMinLevelFromTypeUUIDs(minLevelTypeUUIDs);
        const childrenWithMinLevel = allChildren.filter(({typeUuid}) => _.includes(minLevelTypeUUIDs, typeUuid));
        return childrenWithMinLevel.length > 0 ? childrenWithMinLevel : _.reject(allChildren, ({level}) => level <= minLevel);
    }

    getMinLevelFromTypeUUIDs(minLevelTypeUUIDs) {
        const query = minLevelTypeUUIDs.map(uuid => `typeUuid = '${uuid}'`).join(' OR ');
        return _.minBy([...this.findAll(this.getSchema()).filtered(`voided = false and (${query})`)
            .filtered('TRUEPREDICATE DISTINCT(level)')
            .map(al => al.level)
            .map(_.identity)]);
    }

    isOnLowestLevel(lowestSelectedAddresses, minLevelTypeUUIDs) {
        if (!_.isEmpty(minLevelTypeUUIDs)) {
            return _.every(lowestSelectedAddresses, ({typeUuid}) => _.includes(minLevelTypeUUIDs, typeUuid));
        }
        return _.every(lowestSelectedAddresses, (al) => _.isEmpty(this.getChildren(al.uuid)));
    }
}

export default BaseAddressLevelService;
