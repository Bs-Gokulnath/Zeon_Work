import { Module } from '@nestjs/common';
import { BoardGroupsController } from './board-groups.controller';
import { BoardGroupsService } from './board-groups.service';

@Module({
  controllers: [BoardGroupsController],
  providers: [BoardGroupsService],
})
export class BoardGroupsModule {}
