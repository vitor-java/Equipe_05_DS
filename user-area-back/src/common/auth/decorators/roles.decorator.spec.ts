import 'reflect-metadata';
import { describe, it, expect} from 'vitest';
import { ROLES_KEY, Roles } from './roles.decorator';
import { AccessRole } from '../access-role.enum';
describe('Roles decorator', () => { it('armazena os papéis declarados', () => { class C { @Roles(AccessRole.ADMIN, AccessRole.STAFF) method() {} }; expect(Reflect.getMetadata(ROLES_KEY, C.prototype.method)).toEqual([AccessRole.ADMIN, AccessRole.STAFF]); }); });
