import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTable } from './entities/restaurant-table.entity';
import { TableOrder } from './entities/table-order.entity';
import { RestaurantTablesService } from './restaurant-tables.service';
import { RestaurantTablesController } from './restaurant-tables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantTable, TableOrder])],
  controllers: [RestaurantTablesController],
  providers: [RestaurantTablesService],
  exports: [RestaurantTablesService],
})
export class RestaurantTablesModule {}
