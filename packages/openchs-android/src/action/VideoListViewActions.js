import {Video} from "openchs-models";
import VideoService from "../service/VideoService";
import VideoTelemetric from "openchs-models/src/videos/VideoTelemetric";
import EntityService from "../service/EntityService";
import UserInfoService from "../service/UserInfoService";

class VideoListActions {
    static getInitialState() {
        return {videos: []};
    }

    static clone(state) {
        const {videos} = state;
        return {...state, videos: [...videos]};
    }

    static onLoad(state, action, context) {
        const videoService = context.get(VideoService);
        const result = videoService.getAll(Video.schema.name);
        return {...state, videos: result};
    }

    static resetList(state, action, context) {
        return {
            ...state,
            videos: []
        }
    }

    static onPlayVideo(state, {video, cb}, context) {
        const user = context.get(UserInfoService).getUserInfo();
        const telemetric = VideoTelemetric.create({video, user});
        cb(telemetric);
        return {...state, telemetric};
    }

    static onExitVideo(state, action, context) {
        context.get(EntityService).save(state.telemetric, VideoTelemetric.schema.name);
        return {...state, telemetric: undefined};
    }
}

const Prefix = VideoListActions.Prefix = "VID_LIST";

VideoListActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    ON_PLAY_VIDEO: `${Prefix}.ON_PLAY_VIDEO`,
    RESET_LIST: `${Prefix}.RESET_LIST`,
    ON_EXIT_VIDEO: `${Prefix}.EXIT_VIDEO`,
};

VideoListActions.Map = new Map([
    [VideoListActions.Names.ON_LOAD, VideoListActions.onLoad],
    [VideoListActions.Names.ON_PLAY_VIDEO, VideoListActions.onPlayVideo],
    [VideoListActions.Names.RESET_LIST, VideoListActions.resetList],
    [VideoListActions.Names.ON_EXIT_VIDEO, VideoListActions.onExitVideo],
]);

export default VideoListActions;