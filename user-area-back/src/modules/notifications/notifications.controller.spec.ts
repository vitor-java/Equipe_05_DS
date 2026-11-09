import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const service: any = {
    list: vi.fn(),
    unreadCount: vi.fn(),
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
  };

  const controller = new NotificationsController(service);
  const user: any = { userId: 'u' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates list and unread count', () => {
    const q: any = { page: 1 };

    controller.list(q, user);
    controller.unreadCount(user);

    expect(service.list).toHaveBeenCalledWith(user, q);
    expect(service.unreadCount).toHaveBeenCalledWith(user);
  });

  it('delegates read operations', () => {
    controller.markAllAsRead(user);
    controller.markAsRead('n1', user);

    expect(service.markAllAsRead).toHaveBeenCalledWith(user);
    expect(service.markAsRead).toHaveBeenCalledWith(user, 'n1');
  });
});
