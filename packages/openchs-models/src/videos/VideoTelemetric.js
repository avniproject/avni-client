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
            this.videoStartTime = this._roundToNearestPoint5(videoTime);
        }
    }

    setVideoEndTime(videoTime) {
        this.videoEndTime = this._roundToNearestPoint5(videoTime);
    }

    get toResource() {
        const resource = _.pick(this, ['uuid', 'videoStartTime', 'videoEndTime']);
        resource.playerOpenTime = General.isoFormat(this.playerOpenTime);
        resource.playerCloseTime = General.isoFormat(this.playerCloseTime);
        resource.videoUUID = this.video.uuid;
        return resource;
    }

    //valid outputs 0,0.5,1,1.5,2,2.5,3,3.5...
    _roundToNearestPoint5(n) {
        return Math.round(n * 2)/2;
    }

}

export default VideoTelemetric;