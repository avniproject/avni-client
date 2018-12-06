import BaseEntity from "../BaseEntity";
import General from "../utility/General";
import moment from "moment";

class VideoTelemetric extends BaseEntity {
    static schema = {
        name: "VideoTelemetric",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            video: 'Video',
            playerOpenTime: 'date',
            playerCloseTime: 'date',
            videoStartTime: 'double',//in seconds
            videoEndTime: 'double',//in seconds
            user: 'UserInfo'
        }
    };

    static create(obj={}) {
        const {uuid = General.randomUUID()} = obj;
        return Object.assign(new VideoTelemetric(), _.pick(obj, [
            'uuid',
            'video',
            'playerOpenTime',
            'playerCloseTime',
            'videoStartTime',
            'videoEndTime',
            'user'
        ]), {uuid});
    }

    static fromResource() {
        General.logWarn('This should never be called. The server should always return empty array.\n' +
            'So, no need to create realm entities.');
        return VideoTelemetric.create({});
    }

    cloneForReference() {
        return VideoTelemetric.create({...this});
    }

    setPlayerOpenTime() {
        this.playerOpenTime = moment().toDate();
    }

    setPlayerCloseTime() {
        this.playerCloseTime = moment().toDate();
    }

    setOnceVideoStartTime(videoTime) {
        if(_.isNil(this.videoStartTime)) {
            this.videoStartTime = videoTime;
        }
    }

    setVideoEndTime(videoTime) {
        this.videoEndTime = videoTime;
    }

    get toResource() {
        const resource = _.pick(this, ['uuid', 'watchedDuration']);
        resource.playerOpenTime = General.isoFormat(this.playerOpenTime);
        resource.playerCloseTime = General.isoFormat(this.playerCloseTime);
        resource.videoUUID = this.video.uuid;
        resource.userUUID = this.user.uuid;
        return resource;
    }

}

export default VideoTelemetric;