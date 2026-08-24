import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class CommonModule {}
