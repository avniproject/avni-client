function ServerError(response) {
    this.name = "Server Error";
    this.text = response.text();
}

ServerError.prototype =  Error.prototype;

export default ServerError;
