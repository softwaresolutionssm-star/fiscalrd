import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query, ParseUUIDPipe } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ConsolidatedOnlyGuard } from '../common/guards/consolidated-only.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums/roles.enum';

interface AuthUser { id: string; tenantId: string; role: string; }

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard, ConsolidatedOnlyGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.ACCOUNTANT)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('seed-accounts')
  seedAccounts(@CurrentUser() user: AuthUser) {
    return this.accountingService.seedDefaultAccounts(user.tenantId);
  }

  @Get('accounts')
  findAccounts(@CurrentUser() user: AuthUser) {
    return this.accountingService.findAllAccounts(user.tenantId);
  }

  @Post('accounts')
  createAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(user.tenantId, dto);
  }

  @Get('journal-entries')
  findJournalEntries(@CurrentUser() user: AuthUser) {
    return this.accountingService.findAllJournalEntries(user.tenantId);
  }

  @Post('journal-entries')
  createJournalEntry(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalEntryDto) {
    return this.accountingService.createJournalEntry(user.tenantId, dto);
  }

  @Post('journal-entries/:id/post')
  postJournalEntry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.accountingService.postJournalEntry(id, user.tenantId);
  }

  @Patch('accounts/:id/opening-balance')
  setOpeningBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body('balance') balance: number,
  ) {
    return this.accountingService.setOpeningBalance(user.tenantId, id, balance);
  }

  @Get('balance-sheet')
  balanceSheet(@CurrentUser() user: AuthUser) {
    return this.accountingService.balanceSheet(user.tenantId);
  }

  @Get('income-statement')
  incomeStatement(
    @CurrentUser() user: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    const now = new Date();
    return this.accountingService.incomeStatement(
      user.tenantId,
      parseInt(year) || now.getFullYear(),
      month ? parseInt(month) : undefined,
    );
  }
}
