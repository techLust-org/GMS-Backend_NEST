import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { User, Role, Shop, UserDocument, DocumentAccessLog } from '../models';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { AdminDocumentsController } from './admin-documents.controller';

@Module({
  imports: [SequelizeModule.forFeature([User, Role, Shop, UserDocument, DocumentAccessLog])],
  controllers: [DocumentsController, AdminDocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
