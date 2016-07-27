import Minio from 'minio';

class MinioClient {
    static factory(endpoint, port, accessKey, secretKey) {
        return new Minio({
            endPoint: endpoint,
            port: port,
            secure: true,
            accessKey: accessKey,
            secretKey: secretKey
        });
    }
}

export default MinioClient;