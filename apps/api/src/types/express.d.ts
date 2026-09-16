import 'express-session';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    discordOAuth?: {
      state: string;
      verifier: string;
      createdAt: number;
    };
  }
}

export {};
