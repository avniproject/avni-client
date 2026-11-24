module.exports = {
    open: jest.fn(() => ({
        executeSync: jest.fn(() => ({rows: []})),
        execute: jest.fn(() => Promise.resolve({rows: []})),
        close: jest.fn(),
    })),
};
