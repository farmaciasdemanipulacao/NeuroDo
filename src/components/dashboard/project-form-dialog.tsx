'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ManagedProject, ProjectCategory, ProjectValueType, OwnerRole } from '@/lib/types';
import {
  Loader2,
  Briefcase,
  Building2,
  Rocket,
  Target,
  TrendingUp,
  Heart,
  Star,
  Leaf,
  Zap,
  Globe,
  Code2,
  Megaphone,
  Users,
  Camera,
  ShoppingCart,
  Beaker,
  Podcast,
  DollarSign,
  Palette,
  Lightbulb,
  Dumbbell,
  Coffee,
  Music,
  Home,
  type LucideIcon,
} from 'lucide-react';

// ── Schema ────────────────────────────────────────────────────────────────────

const projectFormSchema = z.object({
  name: z.string().min(3, 'O nome precisa ter pelo menos 3 caracteres.').max(80),
  description: z.string().min(10, 'A descrição precisa ter pelo menos 10 caracteres.').max(500),
  category: z.enum(['execution', 'oversight', 'personal'] as const),
  valueType: z.enum(['financial', 'amplifier', 'personal', 'experimental'] as const),
  ownerRole: z.enum(['leader', 'trainer', 'consultant', 'away'] as const),
  responsibleName: z.string().nullable(),
  parentId: z.string().nullable(),
  icon: z.string().min(1),
  iconColor: z.string().min(1),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

// ── Ícones disponíveis ────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase,
  Building2,
  Rocket,
  Target,
  TrendingUp,
  Heart,
  Star,
  Leaf,
  Zap,
  Globe,
  Code2,
  Megaphone,
  Users,
  Camera,
  ShoppingCart,
  Beaker,
  Podcast,
  DollarSign,
  Palette,
  Lightbulb,
  Dumbbell,
  Coffee,
  Music,
  Home,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

// ── Cores disponíveis ─────────────────────────────────────────────────────────

const COLOR_OPTIONS: { hex: string; label: string }[] = [
  { hex: '#22C55E', label: 'Verde' },
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#8B5CF6', label: 'Roxo' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#F59E0B', label: 'Âmbar' },
  { hex: '#EC4899', label: 'Rosa' },
  { hex: '#06B6D4', label: 'Ciano' },
  { hex: '#F97316', label: 'Laranja' },
  { hex: '#84CC16', label: 'Lima' },
  { hex: '#64748B', label: 'Cinza' },
];

// ── Labels ────────────────────────────────────────────────────────────────────

const categoryOptions: { value: ProjectCategory; label: string; description: string }[] = [
  { value: 'execution', label: '🚀 Execução', description: 'Você opera diretamente e é responsável pela entrega' },
  { value: 'oversight', label: '👁 Acompanhamento', description: 'Delega 70%+, acompanha resultados' },
  { value: 'personal', label: '🌱 Pessoal', description: 'Vida pessoal, saúde, família' },
];

const valueTypeOptions: { value: ProjectValueType; label: string; description: string }[] = [
  { value: 'financial', label: '💰 Financeiro', description: 'Gera receita direta' },
  { value: 'amplifier', label: '📣 Amplificador', description: 'Audiência, autoridade, distribuição' },
  { value: 'personal', label: '❤️ Pessoal', description: 'Bem-estar e relações' },
  { value: 'experimental', label: '🧪 Experimental', description: 'Validação de hipótese' },
];

const ownerRoleOptions: { value: OwnerRole; label: string }[] = [
  { value: 'leader', label: 'Líder — opero diretamente' },
  { value: 'trainer', label: 'Treinador — crio processos e capacito' },
  { value: 'consultant', label: 'Consultor — revisão pontual' },
  { value: 'away', label: 'Ausente — delegação total' },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ManagedProject | null;
  allProjects?: ManagedProject[];
  onSubmit: (
    data: Omit<ManagedProject, 'id' | 'userId' | 'changelog' | 'createdAt' | 'updatedAt' | 'deletionScheduledAt' | 'status' | 'priority'>
  ) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  allProjects = [],
  onSubmit,
}: ProjectFormDialogProps) {
  const { toast } = useToast();
  const isEdit = !!project;

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
      category: project?.category ?? 'execution',
      valueType: project?.valueType ?? 'financial',
      ownerRole: project?.ownerRole ?? 'leader',
      responsibleName: project?.responsibleName ?? null,
      parentId: project?.parentId ?? null,
      icon: project?.icon ?? 'Briefcase',
      iconColor: project?.iconColor ?? '#22C55E',
    },
  });

  const { isSubmitting } = form.formState;
  const category = form.watch('category');
  const selectedIcon = form.watch('icon');
  const selectedColor = form.watch('iconColor');

  // Projetos disponíveis como parent (exclui si mesmo e sub-projetos)
  const parentOptions = allProjects.filter(
    (p) => p.id !== project?.id && !p.parentId && p.status === 'active'
  );

  function handleSubmit(values: ProjectFormValues) {
    onSubmit({
      name: values.name,
      description: values.description,
      category: values.category,
      valueType: values.valueType,
      ownerRole: values.ownerRole,
      responsibleName: values.responsibleName || null,
      parentId: values.parentId || null,
      icon: values.icon,
      iconColor: values.iconColor,
    });
    toast({
      title: isEdit ? 'Projeto atualizado' : 'Projeto criado!',
      description: isEdit
        ? `"${values.name}" foi atualizado com sucesso.`
        : `"${values.name}" adicionado aos seus projetos.`,
    });
    onOpenChange(false);
    if (!isEdit) form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do projeto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Farmácias de Manipulação SaaS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Qual o objetivo central deste projeto?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ícone e Cor — lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              {/* Ícone */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <div className="grid grid-cols-6 gap-1.5 mt-1">
                      {ICON_OPTIONS.map((name) => {
                        const IconComponent = ICON_MAP[name];
                        const isSelected = field.value === name;
                        return (
                          <button
                            key={name}
                            type="button"
                            title={name}
                            onClick={() => field.onChange(name)}
                            className={`flex items-center justify-center rounded-md p-2 border transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-muted-foreground hover:bg-accent/5'
                            }`}
                          >
                            <IconComponent
                              className="h-4 w-4"
                              style={{ color: isSelected ? selectedColor : undefined }}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cor do ícone */}
              <FormField
                control={form.control}
                name="iconColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor do ícone</FormLabel>
                    <div className="grid grid-cols-5 gap-2 mt-1">
                      {COLOR_OPTIONS.map((color) => {
                        const isSelected = field.value === color.hex;
                        return (
                          <button
                            key={color.hex}
                            type="button"
                            title={color.label}
                            onClick={() => field.onChange(color.hex)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${
                              isSelected
                                ? 'border-white scale-110 shadow-md'
                                : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: color.hex }}
                          />
                        );
                      })}
                    </div>
                    {/* Preview */}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {(() => {
                        const PreviewIcon = ICON_MAP[selectedIcon] ?? Briefcase;
                        return (
                          <>
                            <div
                              className="flex items-center justify-center w-7 h-7 rounded-md"
                              style={{ backgroundColor: selectedColor + '22', border: `1px solid ${selectedColor}44` }}
                            >
                              <PreviewIcon className="h-4 w-4" style={{ color: selectedColor }} />
                            </div>
                            <span>Preview</span>
                          </>
                        );
                      })()}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Categoria */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid gap-2 mt-1"
                  >
                    {categoryOptions.map((opt) => (
                      <Label
                        key={opt.value}
                        htmlFor={`cat-${opt.value}`}
                        className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 transition-colors"
                      >
                        <RadioGroupItem id={`cat-${opt.value}`} value={opt.value} className="mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de valor */}
            <FormField
              control={form.control}
              name="valueType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de valor</FormLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-2 mt-1"
                  >
                    {valueTypeOptions.map((opt) => (
                      <Label
                        key={opt.value}
                        htmlFor={`vt-${opt.value}`}
                        className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 transition-colors"
                      >
                        <RadioGroupItem id={`vt-${opt.value}`} value={opt.value} className="mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.description}</p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Papel do dono */}
            <FormField
              control={form.control}
              name="ownerRole"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seu papel neste projeto</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu papel" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ownerRoleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Responsável (apenas para acompanhamento) */}
            {category === 'oversight' && (
              <FormField
                control={form.control}
                name="responsibleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do responsável</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Quem operacionaliza este projeto?"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Projeto pai (opcional) */}
            {parentOptions.length > 0 && (
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-projeto de (opcional)</FormLabel>
                    <Select
                      value={field.value ?? 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Projeto raiz (nenhum)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (projeto raiz)</SelectItem>
                        {parentOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Salvar alterações' : 'Criar projeto'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
