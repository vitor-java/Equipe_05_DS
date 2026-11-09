import { HealthController } from './health.controller';
import { describe, it, expect, vi } from 'vitest';
describe('HealthController',()=>{
 it('checks database health through terminus',async()=>{ const health:any={check:vi.fn().mockResolvedValue({status:'ok'})}; const db:any={pingCheck:vi.fn().mockReturnValue('ping')}; const prisma:any={}; const controller=new HealthController(health,db,prisma); await expect(controller.check()).resolves.toEqual({status:'ok'}); expect(health.check).toHaveBeenCalledWith([expect.any(Function)]); const callback=health.check.mock.calls[0][0][0]; expect(callback()).toBe('ping'); expect(db.pingCheck).toHaveBeenCalledWith('database',prisma); });
});
