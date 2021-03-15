import NewsService from "../../service/news/NewsService";

class NewsActions {

    static getInitialState(context) {
        return {
            news: []
        };
    }

    static onLoad(state, action, context) {
        const newState = {...state};
        newState.news = context.get(NewsService).getAllOrderedNews();
        return newState;
    }
}

const ActionPrefix = 'News';

const NewsActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
};

const NewsActionMap = new Map([
    [NewsActionNames.ON_LOAD, NewsActions.onLoad],
]);

export {NewsActions, NewsActionNames, NewsActionMap}
