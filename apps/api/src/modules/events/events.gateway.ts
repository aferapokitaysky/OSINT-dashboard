import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { AccessControlService } from '../../common/access-control.service';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { SessionUser } from '@osint/types';

interface AuthenticatedSocket extends Socket {
  data: { user?: SessionUser };
}

interface SubscribeBody {
  entityId?: string;
  investigationId?: string;
}

@WebSocketGateway({
  path: '/ws',
  namespace: 'events',
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('EventsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly accessControl: AccessControlService,
    private readonly configService: ConfigService,
  ) {}

  // Auth lives in Socket.IO connection middleware (server.use), not in
  // handleConnection: handleConnection is a Nest lifecycle hook that fires
  // *after* the client already sees "connect" and can already emit
  // messages, so an async check there (JWT verify + a DB lookup) races
  // against the client's first message. Middleware registered via
  // server.use() genuinely blocks the handshake until next() is called, so
  // client.data.user is guaranteed to be set before any handler runs.
  afterInit(server: Server) {
    server.use((socket: AuthenticatedSocket, next: (err?: Error) => void) => {
      this.authenticate(socket)
        .then((user) => {
          socket.data.user = user;
          next();
        })
        .catch((err: Error) => {
          this.logger.warn(`Rejected WS connection ${socket.id}: ${err.message}`);
          next(new Error('Unauthorized'));
        });
    });
  }

  private async authenticate(client: Socket): Promise<SessionUser> {
    const token = this.extractToken(client);
    if (!token) throw new Error('Missing token');

    const payload = this.jwtService.verify(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });
    const user = await this.authService.validateUser(payload);
    if (!user) throw new Error('Invalid or inactive user');
    return user;
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id} (${client.data.user?.email})`);
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SubscribeBody,
  ) {
    const room = await this.resolveAuthorizedRoom(client.data.user!, body);
    if (!room) {
      return { event: 'error', data: { message: 'Access denied or invalid target' } };
    }
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    return { event: 'subscribed', data: { room } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() body: SubscribeBody,
  ) {
    const room = body.entityId
      ? `entity:${body.entityId}`
      : body.investigationId
        ? `investigation:${body.investigationId}`
        : null;
    if (!room) {
      return { event: 'error', data: { message: 'Invalid target' } };
    }
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    return { event: 'unsubscribed', data: { room } };
  }

  emitToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data);
  }

  emitToAll(event: string, data: unknown) {
    this.server.emit(event, data);
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const header = client.handshake.headers?.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);

    return null;
  }

  // Client asks "what do you want to watch", server decides the room name and
  // whether the user is allowed to join it — the room string itself is never
  // client-supplied, so there's nothing to guess/enumerate.
  private async resolveAuthorizedRoom(
    user: SessionUser,
    body: SubscribeBody,
  ): Promise<string | null> {
    if (body.entityId) {
      const allowed = await this.accessControl.canAccessEntity(user, body.entityId);
      return allowed ? `entity:${body.entityId}` : null;
    }
    if (body.investigationId) {
      const allowed = await this.accessControl.canAccessInvestigation(user, body.investigationId);
      return allowed ? `investigation:${body.investigationId}` : null;
    }
    return null;
  }
}
