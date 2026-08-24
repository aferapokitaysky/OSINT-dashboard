import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { SessionUser } from '@osint/types';

interface AuthenticatedSocket extends Socket {
  data: { user?: SessionUser };
}

// Defense in depth: the connection itself is already authenticated in
// EventsGateway#handleConnection (which disconnects unauthenticated sockets),
// this guard just re-asserts that on every message handler.
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    if (!client.data?.user) {
      throw new WsException('Unauthorized');
    }
    return true;
  }
}
