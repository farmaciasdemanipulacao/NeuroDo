'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, waitForAuthPersistence } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User as FirebaseAuthUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { seedNewUserData } from '@/firebase/seed';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, LogIn, UserPlus, Chrome, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/dashboard/logo';

const ADMIN_EMAIL = 'gustavobragacamargo@gmail.com';

function friendlyAuthMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';

  const messages: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
    'auth/invalid-email': 'Informe um e-mail válido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
    'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
    'auth/popup-closed-by-user': 'Login com Google cancelado.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Tente novamente.',
    'auth/cancelled-popup-request': 'Outra tentativa de login já está em andamento.',
    'auth/account-exists-with-different-credential': 'Já existe uma conta com este e-mail usando outro método de acesso.',
    'auth/unauthorized-domain': 'Este domínio ainda não está autorizado para login com Google.',
    'auth/operation-not-allowed': 'Este método de login ainda não está habilitado.',
  };

  return messages[code] ?? 'Não foi possível concluir o acesso. Tente novamente.';
}

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const ensureUserDocument = async (authUser: FirebaseAuthUser) => {
    const userRef = doc(firestore, 'users', authUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) return;

    const role: UserRole =
      authUser.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';

    await seedNewUserData(
      firestore,
      authUser.uid,
      authUser.email,
      authUser.displayName || 'Usuário',
      authUser.photoURL,
      role
    );
  };

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);


  const handleEmailSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      await waitForAuthPersistence();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast({ title: 'Bem-vindo de volta!' });
      router.replace('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: friendlyAuthMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const newUser = userCredential.user;

      await updateProfile(newUser, { displayName: name.trim() });

      const role: UserRole =
        newUser.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';

      await seedNewUserData(
        firestore,
        newUser.uid,
        newUser.email,
        name.trim(),
        newUser.photoURL,
        role
      );

      toast({ title: 'Conta criada com sucesso!' });
      router.replace('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar conta',
        description: friendlyAuthMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast({
        title: 'Digite seu e-mail primeiro',
        description: 'Use o mesmo e-mail da sua conta do NeuroDO.',
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast({
        title: 'E-mail de redefinição enviado',
        description: 'Confira sua caixa de entrada e também a pasta de spam.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível redefinir a senha',
        description: friendlyAuthMessage(error),
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await waitForAuthPersistence();

      const result = await signInWithPopup(auth, provider);
      await ensureUserDocument(result.user);

      toast({ title: 'Login com Google realizado!' });
      router.replace('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro no login com Google',
        description: friendlyAuthMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background p-4 pt-8 sm:justify-center sm:pt-0">
      <div className="mb-6 flex flex-col items-center gap-2 sm:mb-8">
        <Logo variant="horizontal" size="xl" className="max-w-[24rem]" />
        <p className="text-muted-foreground">Seu SO para produtividade neurodivergente</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Acesse sua conta</CardTitle>
          <CardDescription className="text-center">
            Escolha como deseja entrar no NeuroDO
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isLoading || isResettingPassword}
                      className="text-xs text-primary underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isResettingPassword ? 'Enviando...' : 'Esqueci minha senha'}
                    </button>
                  </div>

                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || isResettingPassword}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    placeholder="Seu nome"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Use pelo menos 6 caracteres.</p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading || isResettingPassword}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="mr-2 h-4 w-4" />
            )}
            Google
          </Button>

        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="px-6 text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
