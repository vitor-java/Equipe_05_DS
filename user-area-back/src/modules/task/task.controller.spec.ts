import { TaskController } from './task.controller';
describe('TaskController',()=>{
 const service:any={create:vi.fn(),findAll:vi.fn(),findOne:vi.fn(),update:vi.fn(),remove:vi.fn()};
 const controller=new TaskController(service);
 beforeEach(()=>vi.clearAllMocks());
 it('delegates create with authenticated user ID',async()=>{ service.create.mockResolvedValue({id:'1'}); const dto:any={title:'x'}; await expect(controller.create(dto,{userId:'u'} as any)).resolves.toEqual({id:'1'}); expect(service.create).toHaveBeenCalledWith(dto,'u'); });
 it('creates without user when context is absent',()=>{ controller.create({} as any); expect(service.create).toHaveBeenCalledWith({},undefined); });
 it('delegates list, detail, update and remove',async()=>{ const q:any={page:1}; service.findAll.mockResolvedValue([]); service.findOne.mockResolvedValue({id:'1'}); service.update.mockResolvedValue({id:'1'}); service.remove.mockResolvedValue(undefined); await controller.findAll(q); await controller.findOne('1'); await controller.update('1',{} as any); await controller.remove('1'); expect(service.findAll).toHaveBeenCalledWith(q); expect(service.findOne).toHaveBeenCalledWith('1'); expect(service.update).toHaveBeenCalledWith('1',{}); expect(service.remove).toHaveBeenCalledWith('1'); });
});
