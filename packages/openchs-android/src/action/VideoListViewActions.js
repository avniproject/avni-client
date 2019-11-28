import VideoService from "../service/VideoService";
import { Video, VideoTelemetric  } from 'avni-models';
import EntityService from "../service/EntityService";
import General from "../utility/General";

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
        const telemetric = VideoTelemetric.create({video});
        telemetric.setPlayerOpenTime();
        cb(telemetric);
        return {...state, telemetric};
    }

    static onExitVideo(state, {error}, context) {
        if (!error) {
            state.telemetric.setPlayerCloseTime();
            context.get(EntityService).saveAndPushToEntityQueue(state.telemetric, VideoTelemetric.schema.name);
        } else {
            General.logDebug('VideoListActions',`Some error occurred: ${error}`);
        }
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