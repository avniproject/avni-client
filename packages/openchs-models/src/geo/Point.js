class Point {
    static schema = {
        name: 'Point',
        properties: {
            x: 'double',
            y: 'double'
        }
    };

    static newInstance(x, y) {
        const point = new Point();
        point.x = x;
        point.y = y;
        return point;
    }

    static fromResource(resource) {
        return Point.newInstance(resource.x, resource.y);
    }

    get toResource() {
        const resource = {};
        resource.x = this.x;
        resource.y = this.y;
        return resource;
    }

    clone() {
        return Point.newInstance(this.x, this.y);
    }
}

export default Point;