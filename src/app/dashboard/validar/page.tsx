import { FirestoreValidator } from '@/components/dashboard/firestore-validator';

export default function ValidarPage() {
  return (
    <div className="flex-1 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Validar Firestore</h1>
        <p className="text-muted-foreground mt-1">
          Confirme que todos os dados estão sendo lidos e gravados no banco — nada fica preso em memória local.
        </p>
      </div>
      <FirestoreValidator />
    </div>
  );
}
