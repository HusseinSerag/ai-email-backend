"use strict";
// for each job there is a userId, w kol jobId is unique fa u just need a map of string to string
// for each userId there is a unique socket
// el fekra hena en we can just pass the userId through everything fa msh lazem aslun its map la2nha kda kda maana
// el msh maana baa hwa el socket w hena hane7tag el map, en el user l strings of sockets
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectedUsers = void 0;
class ConnectedUsersMaps {
    constructor() {
        this.connectedUsers = new Map();
    }
    addSocketToMap(userId, socketId) {
        const connectedSockets = this.connectedUsers.get(userId) || [];
        this.connectedUsers.set(userId, [...connectedSockets, socketId]);
    }
    removeSocketFromMap(userId, socketId) {
        if (this.connectedUsers.has(userId)) {
            const sockets = this.connectedUsers.get(userId);
            const foundUser = sockets.findIndex((socket) => socket === socketId);
            if (foundUser > -1) {
                sockets.splice(foundUser, 1);
                this.connectedUsers.set(userId, sockets);
            }
        }
    }
    getSocketFromMap(userId) {
        const sockets = this.connectedUsers.get(userId) || [];
        return sockets;
    }
}
exports.connectedUsers = new ConnectedUsersMaps();
