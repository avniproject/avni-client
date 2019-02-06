class Point {
    static schema = {
        name: 'Point',
        properties: {
            x: 'double',
            y: 'double'
        }
    };

    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    static fromResource(resource) {
        return new Point(resource.x, resource.y);
    }

    get toResource() {
        const resource = {};
        resource.x = this.x;
        resource.y = this.y;
        return resource;
    }

    clone() {
        return new Point(this.x, this.y);
    }
}

export default Point;