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

    static onNewsPress(state, action, context) {
        const newState = {...state};
        const newsService = context.get(NewsService);
        const {cb, newsUUID} = action;
        const newsToMarkRead = newsService.findByUUID(newsUUID);
        const readNews = newsToMarkRead.markRead();
        newsService.saveOrUpdate(readNews);
        newState.news = newsService.getAllOrderedNews();
        cb();
        return state;
    }
}

const ActionPrefix = 'News';

const NewsActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_NEWS_PRESS: `${ActionPrefix}.ON_NEWS_PRESS`,
};

const NewsActionMap = new Map([
    [NewsActionNames.ON_LOAD, NewsActions.onLoad],
    [NewsActionNames.ON_NEWS_PRESS, NewsActions.onNewsPress],
]);

export {NewsActions, NewsActionNames, NewsActionMap}
