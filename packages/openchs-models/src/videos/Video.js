import BaseEntity from "../BaseEntity";

class Video extends BaseEntity {
    static schema = {
        name: "Video",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            title: 'string',
            filePath: 'string',
            description: {type: 'string', optional: true},
            duration: 'double'
        }
    };

    static create({uuid, title, filePath, description, duration}) {
        return Object.assign(new Video(), {uuid, title, filePath, description, duration});
    }

    static fromResource(resource) {
        return Video.create(resource);
    }

    cloneForReference() {
        return Video.create({...this});
    }

    get translatedFieldValue() {
        return this.title;
    }
}

export default Video;