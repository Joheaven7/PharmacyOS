export interface RequestUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  userId?: string;
  organizationId?: string;
  roles: string[];
  permissions: string[];
  user?: RequestUser;
  requestId: string;
}

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}
