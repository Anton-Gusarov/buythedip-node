const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync(
    '../proto/proto.proto',
    {keepCase: true,
     longs: String,
     enums: String,
     defaults: true,
     oneofs: true
    });
var candlesProto:any = grpc.loadPackageDefinition(packageDefinition).candles;
export {grpc,candlesProto}