"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candlesProto = exports.grpc = void 0;
const grpc = require('@grpc/grpc-js');
exports.grpc = grpc;
const protoLoader = require('@grpc/proto-loader');
var packageDefinition = protoLoader.loadSync('../proto/proto.proto', { keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
var candlesProto = grpc.loadPackageDefinition(packageDefinition).candles;
exports.candlesProto = candlesProto;
