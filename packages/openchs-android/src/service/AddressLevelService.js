import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import {AddressLevel} from 'openchs-models';
import {common, motherCalculations} from "openchs-health-modules";

@Service("addressLevelService")
class AddressLevelService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AddressLevel.schema.name;
    }

    maxLevel() {
        let sortedByLevels = this.findAll(this.getSchema()).sorted('level', true)[0];
        return _.defaultTo(sortedByLevels, {level: 0}).level;
    }

    minLevel() {
        return this.findAll(this.getSchema()).sorted('level', false)[0].level;
    }

    getAllAtLevel(level) {
        return [...this.findAllByCriteria(`level = ${level}`, this.getSchema()).map(_.identity)];
    }

    getAllAtLevelWithParent(level, parentUUID) {
        return [...this.findAllByCriteria(`level = ${level} AND locationMappings.parent = '${parentUUID}'`,
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

    getParentsOfLeaf(leaf) {
        if (this.isRoot(leaf)) {
            return [];
        } else {
            const parents = leaf.locationMappings.map(lm => lm.parent);
            let lowestLevelParent = this.lowestLevelAmongst(parents);
            return this.getParentsOfLeaf(lowestLevelParent).concat([lowestLevelParent]);
        }
    }

    getChildrenParent(parentUUID) {
        if (_.isNil(parentUUID)) return [];
        return [...this.findAllByCriteria(`locationMappings.parent.uuid = '${parentUUID}'`, this.getSchema())
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
}

export default AddressLevelService;