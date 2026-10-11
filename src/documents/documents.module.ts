import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AdminDocumentsController } from './admin-documents.controller';

@Module({
  controllers: [DocumentsController, AdminDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
