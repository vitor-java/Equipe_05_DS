import { AlertsController } from './alerts.controller';

describe('AlertsController', () => {
  const service: any = {
    create: vi.fn(),
    findAll: vi.fn(),
    searchRecipients: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
  };

  const controller = new AlertsController(service);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates alert creation and history', () => {
    const dto: any = { subject: 'x' };
    const user: any = { userId: 'a' };
    const query: any = { page: 1 };

    controller.create(dto, user);
    controller.findAll(query);

    expect(service.create).toHaveBeenCalledWith(user, dto);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates recipient search and detail/removal', () => {
    controller.searchRecipients({ q: 'ana' } as any);
    controller.findOne('id');
    controller.remove('id');

    expect(service.searchRecipients).toHaveBeenCalledWith('ana');
    expect(service.findOne).toHaveBeenCalledWith('id');
    expect(service.remove).toHaveBeenCalledWith('id');
  });
});
