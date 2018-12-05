import {Video} from "openchs-models";
import VideoService from "../service/VideoService";

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

    static playVideo(state, action, context) {
        action.cb();
        return state;
    }
}

const Prefix = VideoListActions.Prefix = "VID_LIST";

VideoListActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    PLAY_VIDEO: `${Prefix}.PLAY_VIDEO`,
    RESET_LIST: `${Prefix}.RESET_LIST`
};

VideoListActions.Map = new Map([
    [VideoListActions.Names.ON_LOAD, VideoListActions.onLoad],
    [VideoListActions.Names.PLAY_VIDEO, VideoListActions.playVideo],
    [VideoListActions.Names.RESET_LIST, VideoListActions.resetList]
]);

export default VideoListActions;