import { FirebaseAuthService } from '@darun/utils-auth-service-firebase';

class Container {
  private static instance: Container;
  public static getInstance() {
    Container.instance ??= new Container();

    return Container.instance;
  }

  get authService() {
    return new FirebaseAuthService({
      projectId: 'darun-io',
      authDomain: 'darun-io.firebaseapp.com',
      privateKey: process.env['FIREBASE_PRIVATE_KEY'] ?? '',
      clientEmail: process.env['FIREBASE_CLIENT_EMAIL'] ?? '',
      apiKey: process.env['NEXT_PUBLIC_FIREBASE_API_KEY'] ?? '',
    });
  }
}

export const container = Container.getInstance();
