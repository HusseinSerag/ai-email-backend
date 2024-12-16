// for each job there is a userId, w kol jobId is unique fa u just need a map of string to string
// for each userId there is a unique socket
// el fekra hena en we can just pass the userId through everything fa msh lazem aslun its map la2nha kda kda maana
// el msh maana baa hwa el socket w hena hane7tag el map, en el user l strings of sockets

class ConnectedUsersMaps {
  private connectedUsers = new Map<string, string[]>();

  addSocketToMap(userId: string, socketId: string) {
    const connectedSockets = this.connectedUsers.get(userId) || [];
    this.connectedUsers.set(userId, [...connectedSockets, socketId]);
  }

  removeSocketFromMap(userId: string, socketId: string) {
    if (this.connectedUsers.has(userId)) {
      const sockets = this.connectedUsers.get(userId)!;
      const foundUser = sockets.findIndex((socket) => socket === socketId);
      if (foundUser > -1) {
        sockets.splice(foundUser, 1);
        this.connectedUsers.set(userId, sockets);
      }
    }
  }

  getSocketFromMap(userId: string) {
    const sockets = this.connectedUsers.get(userId) || [];
    return sockets;
  }
}

export const connectedUsers = new ConnectedUsersMaps();
