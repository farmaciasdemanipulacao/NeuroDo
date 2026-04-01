'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const defaultFormState = {
  neurodivergence: '',
  medication: '',
  diagnoses: '',
  limitingBeliefs: '',
  challenges: '',
  preferredResponseStyle: '',
  addictions: '',
  additionalNotes: '',
};

export default function MentorProfilePage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [formState, setFormState] = useState(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);

  const mentorProfileRef = user && firestore ? doc(firestore, 'users', user.uid, 'mentorDo', 'profile') : null;
  const { data: mentorProfile, isLoading: isProfileLoading } = useDoc(mentorProfileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    if (mentorProfile) {
      setFormState({
        neurodivergence: Array.isArray(mentorProfile.neurodivergence)
          ? mentorProfile.neurodivergence.join(', ')
          : mentorProfile.neurodivergence || '',
        medication: mentorProfile.medication || '',
        diagnoses: mentorProfile.diagnoses || '',
        limitingBeliefs: mentorProfile.limitingBeliefs || '',
        challenges: mentorProfile.challenges || '',
        preferredResponseStyle: mentorProfile.preferences?.responseStyle || '',
        addictions: Array.isArray(mentorProfile.addictions)
          ? mentorProfile.addictions.map((a: any) => `${a.name}${a.willingToChange ? ' (quer mudar)' : ''}`).join('; ')
          : '',
        additionalNotes: mentorProfile.preferences?.attentionFocus || '',
      });
    }
  }, [mentorProfile]);

  const handleChange = (field: keyof typeof defaultFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Erro de autenticação', description: 'Usuário não autenticado.' });
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(mentorProfileRef!, {
        userId: user.uid,
        neurodivergence: formState.neurodivergence
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
        medication: formState.medication,
        diagnoses: formState.diagnoses,
        limitingBeliefs: formState.limitingBeliefs,
        challenges: formState.challenges,
        preferences: {
          responseStyle: formState.preferredResponseStyle,
          attentionFocus: formState.additionalNotes,
        },
        addictions: formState.addictions
          .split(';')
          .map(item => item.trim())
          .filter(Boolean)
          .map(name => ({ name, willingToChange: name.includes('(quer mudar)') })),
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      toast({ title: 'Perfil MentorDo salvo com sucesso.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar perfil', description: error.message || 'Tente novamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">MentorDo</h1>
        <p className="text-muted-foreground max-w-2xl">
          Aqui você configura as informações que o MentorDo usa para entender sua situação, emoções e hábitos.
          Quanto mais detalhes você fornecer, mais preciso será o atendimento.
        </p>
      </div>

      <Card className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <CardHeader>
          <CardTitle>Perfil do MentorDo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="mentor-profile-neurodivergence" className="mb-2 block text-sm font-medium text-foreground">Neurodivergência</label>
            <Input
              id="mentor-profile-neurodivergence"
              name="neurodivergence"
              value={formState.neurodivergence}
              onChange={event => handleChange('neurodivergence', event.target.value)}
              placeholder="TDAH, Autismo leve, Dislexia..."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-medication" className="mb-2 block text-sm font-medium text-foreground">Medicação</label>
            <Input
              id="mentor-profile-medication"
              name="medication"
              value={formState.medication}
              onChange={event => handleChange('medication', event.target.value)}
              placeholder="Desvenlafaxina 100mg, Lisdexanfetamina 70mg..."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-diagnoses" className="mb-2 block text-sm font-medium text-foreground">Diagnósticos / Laudos</label>
            <Textarea
              id="mentor-profile-diagnoses"
              name="diagnoses"
              value={formState.diagnoses}
              onChange={event => handleChange('diagnoses', event.target.value)}
              placeholder="Descreva diagnósticos, laudos ou avaliações clínicas relevantes."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-limitingBeliefs" className="mb-2 block text-sm font-medium text-foreground">Crenças limitantes</label>
            <Textarea
              id="mentor-profile-limitingBeliefs"
              name="limitingBeliefs"
              value={formState.limitingBeliefs}
              onChange={event => handleChange('limitingBeliefs', event.target.value)}
              placeholder="Ex: 'Preciso agradar todo mundo', 'Não posso falhar'..."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-challenges" className="mb-2 block text-sm font-medium text-foreground">Desafios e dificuldades</label>
            <Textarea
              id="mentor-profile-challenges"
              name="challenges"
              value={formState.challenges}
              onChange={event => handleChange('challenges', event.target.value)}
              placeholder="Descreva seus principais desafios diários."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-preferredResponseStyle" className="mb-2 block text-sm font-medium text-foreground">Preferências de resposta</label>
            <Input
              id="mentor-profile-preferredResponseStyle"
              name="preferredResponseStyle"
              value={formState.preferredResponseStyle}
              onChange={event => handleChange('preferredResponseStyle', event.target.value)}
              placeholder="Ex: acolhedor, direto, calmo, passo a passo..."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-addictions" className="mb-2 block text-sm font-medium text-foreground">Vícios e hábitos</label>
            <Textarea
              id="mentor-profile-addictions"
              name="addictions"
              value={formState.addictions}
              onChange={event => handleChange('addictions', event.target.value)}
              placeholder="Separe por ponto e vírgula: Ex: Cigarrilha; Açúcar (quer mudar); Facebook..."
            />
          </div>
          <div>
            <label htmlFor="mentor-profile-additionalNotes" className="mb-2 block text-sm font-medium text-foreground">Foco emocional / observações</label>
            <Textarea
              id="mentor-profile-additionalNotes"
              name="additionalNotes"
              value={formState.additionalNotes}
              onChange={event => handleChange('additionalNotes', event.target.value)}
              placeholder="Ex: 'Preciso de respostas mais calmas', 'Meu foco está na regulação emocional'."
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar MentorDo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
