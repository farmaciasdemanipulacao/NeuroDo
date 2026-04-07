'use client';

import { useState } from 'react';
import { Brain, Pill, Plus, Trash2, Save, Loader2, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAboutMe } from '@/hooks/use-about-me';
import type { Medication } from '@/lib/types';

export default function SobreMimPage() {
  const { profile, isLoading, updateProfile, addMedication, removeMedication } = useAboutMe();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Estado do formulário de perfil geral
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [neurodivergence, setNeurodivergence] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [challenges, setChallenges] = useState('');
  const [workStyle, setWorkStyle] = useState('');
  const [lifeGoals, setLifeGoals] = useState('');

  // Estado do formulário de medicamento
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState<Medication['frequency']>('diária');
  const [medFrequencyNote, setMedFrequencyNote] = useState('');
  const [medNotes, setMedNotes] = useState('');
  const [addingMed, setAddingMed] = useState(false);
  const [showMedForm, setShowMedForm] = useState(false);

  // Inicializa campos quando o perfil carrega
  const displayName = profile?.name ?? name;
  const displayAge = profile?.age ? String(profile.age) : age;
  const displayNeurodivergence = profile?.neurodivergence?.join(', ') ?? neurodivergence;
  const displayDiagnoses = profile?.diagnoses ?? diagnoses;
  const displayChallenges = profile?.challenges ?? challenges;
  const displayWorkStyle = profile?.workStyle ?? workStyle;
  const displayLifeGoals = profile?.lifeGoals ?? lifeGoals;

  async function handleSaveProfile() {
    setIsSaving(true);
    try {
      await updateProfile({
        name: name || profile?.name,
        age: age ? Number(age) : profile?.age,
        neurodivergence: neurodivergence
          ? neurodivergence.split(',').map((s) => s.trim()).filter(Boolean)
          : profile?.neurodivergence,
        diagnoses: diagnoses || profile?.diagnoses,
        challenges: challenges || profile?.challenges,
        workStyle: workStyle || profile?.workStyle,
        lifeGoals: lifeGoals || profile?.lifeGoals,
      });
      toast({ title: 'Perfil salvo! O MentorDo agora te conhece melhor.' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddMed() {
    if (!medName.trim()) return;
    setAddingMed(true);
    try {
      await addMedication({
        name: medName.trim(),
        dosage: medDosage.trim() || undefined,
        frequency: medFrequency,
        frequencyNote: medFrequencyNote.trim() || undefined,
        notes: medNotes.trim() || undefined,
      });
      setMedName(''); setMedDosage(''); setMedFrequencyNote(''); setMedNotes('');
      setMedFrequency('diária');
      setShowMedForm(false);
      toast({ title: 'Medicamento salvo!' });
    } catch {
      toast({ title: 'Erro ao salvar medicamento', variant: 'destructive' });
    } finally {
      setAddingMed(false);
    }
  }

  async function handleRemoveMed(id: string) {
    await removeMedication(id);
    toast({ description: 'Medicamento removido.' });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        {[1, 2].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-7 w-7 text-primary" />
          Sobre Mim
        </h1>
        <p className="text-muted-foreground mt-1">
          Seu perfil pessoal para o MentorDo. Quanto mais você preencher, mais personalizado será o suporte.
        </p>
      </div>

      {/* Perfil pessoal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-primary" /> Quem sou eu
          </CardTitle>
          <CardDescription>Contexto pessoal e comportamental para o MentorDo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                placeholder={displayName || 'Seu nome'}
                defaultValue={displayName}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                placeholder={displayAge || 'Ex: 37'}
                defaultValue={displayAge}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="neuro">Neurodivergências / Diagnósticos</Label>
            <Input
              id="neuro"
              placeholder={displayNeurodivergence || 'Ex: TDAH, Superdotação (separar por vírgula)'}
              defaultValue={displayNeurodivergence}
              onChange={(e) => setNeurodivergence(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="diagnoses">Laudos e relatórios clínicos relevantes</Label>
            <Textarea
              id="diagnoses"
              rows={3}
              placeholder={displayDiagnoses || 'Ex: Laudo TDAH percentil 99, Função Executiva comprometida...'}
              defaultValue={displayDiagnoses}
              onChange={(e) => setDiagnoses(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="challenges">Maiores desafios do dia a dia</Label>
            <Textarea
              id="challenges"
              rows={3}
              placeholder={displayChallenges || 'Ex: Iniciar tarefas, manter foco, cumprir prazos...'}
              defaultValue={displayChallenges}
              onChange={(e) => setChallenges(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workStyle">Como você trabalha melhor</Label>
            <Textarea
              id="workStyle"
              rows={2}
              placeholder={displayWorkStyle || 'Ex: Manhã é meu pico, prefiro blocos de 25min, reuniões só à tarde...'}
              defaultValue={displayWorkStyle}
              onChange={(e) => setWorkStyle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lifeGoals">Objetivos de vida (além dos projetos)</Label>
            <Textarea
              id="lifeGoals"
              rows={2}
              placeholder={displayLifeGoals || 'Ex: Mais tempo com família, saúde, viagens, crescimento pessoal...'}
              defaultValue={displayLifeGoals}
              onChange={(e) => setLifeGoals(e.target.value)}
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      {/* Medicamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4 text-primary" /> Medicamentos
          </CardTitle>
          <CardDescription>
            Cadastre suas medicações para que o check-in de energia pergunte se você tomou cada uma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de medicamentos cadastrados */}
          {(profile?.medications ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum medicamento cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {(profile?.medications ?? []).map((med) => (
                <div
                  key={med.id}
                  className="flex items-start justify-between rounded-lg border border-border/50 p-3 gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{med.name}</span>
                      {med.dosage && (
                        <Badge variant="outline" className="text-xs">{med.dosage}</Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">{med.frequency}</Badge>
                    </div>
                    {med.frequencyNote && (
                      <p className="text-xs text-muted-foreground">{med.frequencyNote}</p>
                    )}
                    {med.notes && (
                      <p className="text-xs text-muted-foreground">{med.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemoveMed(med.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário de novo medicamento */}
          {showMedForm ? (
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <p className="text-sm font-medium">Novo medicamento</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="med-name">Nome do medicamento *</Label>
                  <Input
                    id="med-name"
                    placeholder="Ex: Venvanse, Ritalina..."
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="med-dosage">Dosagem</Label>
                  <Input
                    id="med-dosage"
                    placeholder="Ex: 50mg"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Frequência</Label>
                <Select value={medFrequency} onValueChange={(v) => setMedFrequency(v as Medication['frequency'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diária">Diária</SelectItem>
                    <SelectItem value="quando necessário">Quando necessário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="outra">Outra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(medFrequency === 'outra' || medFrequency === 'quando necessário') && (
                <div className="space-y-1.5">
                  <Label htmlFor="med-freq-note">Detalhe da frequência</Label>
                  <Input
                    id="med-freq-note"
                    placeholder="Ex: Só em dias de alta demanda"
                    value={medFrequencyNote}
                    onChange={(e) => setMedFrequencyNote(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="med-notes">Observações</Label>
                <Input
                  id="med-notes"
                  placeholder="Ex: Tomar com alimento, evitar à noite..."
                  value={medNotes}
                  onChange={(e) => setMedNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMed} disabled={addingMed || !medName.trim()} size="sm">
                  {addingMed ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowMedForm(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowMedForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Medicamento
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
