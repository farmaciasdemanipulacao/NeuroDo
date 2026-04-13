'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookCheck,
  FileText,
  FlaskConical,
  FolderKanban,
  LayoutDashboard,
  Map,
  Timer,
  Target,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Users,
  CreditCard,
  LogOut,
  Settings,
  User,
  ShieldCheck,
  Sparkles,
  Zap,
  ChevronRight,
  Home,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    SidebarRail,
    SidebarSeparator,
    useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Logo } from './logo';
import { useProjects } from '@/hooks/use-projects';
import type { ManagedProject } from '@/lib/types';
import { ProjectIcon } from './project-icon';
import { useUser } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/plan', icon: CalendarCheck, label: 'Plano do Dia' },
  { href: '/dashboard/projects', icon: FolderKanban, label: 'Projetos' },
  { href: '/dashboard/delegations', icon: UserCheck, label: 'Delegações' },
  { href: '/dashboard/team', icon: Users, label: 'Equipe' },
  { href: '/dashboard/mentor', icon: Sparkles, label: 'MentorDo' },
  { href: '/dashboard/goals', icon: Target, label: 'Metas' },
  { href: '/dashboard/focus', icon: Timer, label: 'Timer de Foco' },
  { href: '/dashboard/documents', icon: FileText, label: 'Documentos' },
  { href: '/dashboard/roadmap', icon: Map, label: 'Roadmap' },
  { href: '/dashboard/metrics', icon: BarChart3, label: 'Métricas' },
  { href: '/dashboard/energy', icon: Zap, label: 'Energia' },
  { href: '/dashboard/review', icon: BookCheck, label: 'Revisão Noturna' },
];

const revenueSubItems = [
  { href: '/dashboard/revenue/pf', icon: Home, label: 'Receitas PF' },
  { href: '/dashboard/revenue/pj', icon: Building2, label: 'Receitas PJ' },
];

const reportNavItems = [
  {
    href: '/dashboard/reports/energy',
    icon: Zap,
    label: 'Energia',
    question: 'Como está seu nível de energia ao longo dos dias?',
  },
  {
    href: '/dashboard/reports/productivity',
    icon: TrendingUp,
    label: 'Produtividade',
    question: 'Quanto tempo você investiu em cada tarefa, meta e projeto?',
  },
  {
    href: '/dashboard/focus',
    icon: Timer,
    label: 'Foco',
    question: 'Quantos ciclos de foco você completou?',
  },
  {
    href: '/dashboard/metrics',
    icon: BarChart3,
    label: 'Métricas',
    question: 'Como está o progresso geral dos seus projetos e metas?',
  },
  {
    href: '/dashboard/gamification',
    icon: Sparkles,
    label: 'Gamificação',
    question: 'Quais conquistas, níveis e streaks você já desbloqueou?',
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, isAdmin, signOut } = useUser();
  const { projects: managedProjects, isLoading: projectsLoading } = useProjects();

  // Top 5: execução primeiro (por prioridade), depois os demais ativos
  const topProjects = (managedProjects ?? [])
    .filter((p) => p.status === 'active')
    .sort((a, b) => {
      if (a.category === 'execution' && b.category !== 'execution') return -1;
      if (a.category !== 'execution' && b.category === 'execution') return 1;
      return (a.priority ?? 99) - (b.priority ?? 99);
    })
    .slice(0, 5);

  const isRevenueActive = pathname.startsWith('/dashboard/revenue');

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const sidebarHeader = (
    <div className="flex flex-col p-3 pt-4 pb-0">
      <div className="flex flex-col group-data-[collapsible=icon]:hidden">
        <Logo variant="horizontal" size="lg" className="max-w-[16rem]" />
        <p className="text-[10px] text-muted-foreground/50 tracking-widest uppercase pl-2 -mt-1 mb-3">
          Acreditamos em Você!
        </p>
      </div>
      <div className="hidden items-center justify-center pb-3 group-data-[collapsible=icon]:flex">
        <Logo variant="icon" size="sm" className="max-w-[4rem]" />
      </div>
      <div className="h-px bg-border/40 -mx-3" />
    </div>
  );

  return (
    <Sidebar collapsible="icon" header={sidebarHeader}>
        <SidebarContent>
            <SidebarMenu>
                {navItems.map(({ href, icon: Icon, label }) => (
                    <SidebarMenuItem key={href}>
                         <Link href={href} passHref onClick={handleLinkClick}>
                            <SidebarMenuButton tooltip={label} isActive={pathname === href} asChild>
                                <span>
                                    <Icon />
                                    <span>{label}</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}

                {/* ── Relatórios ── */}
                <SidebarMenuItem>
                  <Collapsible defaultOpen={false} className="group/collapsible w-full">
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Relatórios" className="w-full">
                        <TrendingUp />
                        <span>Relatórios</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {reportNavItems.map(({ href, icon: Icon, label, question }) => (
                          <SidebarMenuSubItem key={href}>
                            <SidebarMenuSubButton asChild isActive={pathname === href || pathname.startsWith(href)}>
                              <Link href={href} onClick={handleLinkClick} title={question}>
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>

                {/* ── Receitas com submenu expansível ── */}
                <SidebarMenuItem>
                    <Collapsible defaultOpen={isRevenueActive} className="group/collapsible w-full">
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                tooltip="Receitas"
                                isActive={isRevenueActive}
                                className="w-full"
                            >
                                <TrendingUp />
                                <span>Receitas</span>
                                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <SidebarMenuSub>
                                {revenueSubItems.map(({ href, icon: Icon, label }) => (
                                    <SidebarMenuSubItem key={href}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={pathname === href || pathname.startsWith(href)}
                                        >
                                            <Link href={href} onClick={handleLinkClick}>
                                                <Icon />
                                                <span>{label}</span>
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </CollapsibleContent>
                    </Collapsible>
                </SidebarMenuItem>

                {isAdmin && (
                    <>
                        <SidebarMenuItem>
                            <Link href="/dashboard/admin" passHref onClick={handleLinkClick}>
                                <SidebarMenuButton tooltip="Admin" isActive={pathname === '/dashboard/admin'} asChild>
                                    <span>
                                        <ShieldCheck className="text-amber-500" />
                                        <span>Admin Panel</span>
                                    </span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <Link href="/dashboard/validar" passHref onClick={handleLinkClick}>
                                <SidebarMenuButton tooltip="Validar Firestore" isActive={pathname === '/dashboard/validar'} asChild>
                                    <span>
                                        <FlaskConical className="text-cyan-400" />
                                        <span>Validar Firestore</span>
                                    </span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </>
                )}
            </SidebarMenu>

             <SidebarSeparator className="my-4" />

             <SidebarMenu>
                <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-wider group-data-[collapsible=icon]:hidden">PROJETOS</p>
                {projectsLoading ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled className="opacity-50">
                      <FolderKanban className="h-4 w-4" />
                      <span>Carregando...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : topProjects.length === 0 ? (
                  <SidebarMenuItem>
                    <Link href="/dashboard/projects" passHref onClick={handleLinkClick}>
                      <SidebarMenuButton tooltip="Cadastrar projetos" asChild>
                        <span className="text-muted-foreground">
                          <FolderKanban className="h-4 w-4" />
                          <span>Sem projetos</span>
                        </span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ) : (
                  topProjects.map((project) => (
                    <SidebarMenuItem key={project.id}>
                      <Link href="/dashboard/projects" passHref onClick={handleLinkClick}>
                        <SidebarMenuButton
                          tooltip={project.name}
                          isActive={pathname === '/dashboard/projects'}
                          asChild
                        >
                          <span>
                            <ProjectIcon icon={project.icon} iconColor={project.iconColor} />
                            <span className="truncate">{project.name}</span>
                          </span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))
                )}
             </SidebarMenu>
        </SidebarContent>

        <div className="h-px bg-border/40 mx-3" />

        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="group data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                                    <AvatarFallback className="rounded-lg">
                                        {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user?.displayName || 'Usuário'}</span>
                                    <span className="truncate text-xs">{user?.email}</span>
                                </div>
                                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                            </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                            side="bottom"
                            align="end"
                            sideOffset={4}
                        >
                            <DropdownMenuLabel className="p-0 font-normal">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || ''} />
                                        <AvatarFallback className="rounded-lg">
                                            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{user?.displayName || 'Usuário'}</span>
                                        <span className="truncate text-xs">{user?.email}</span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings/sobre-mim" className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>Sobre Mim</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings" className="flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    <span>Configurações</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/billing" className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    <span>Cobrança</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
                                <LogOut className="h-4 w-4 mr-2" />
                                <span>Sair</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
    </Sidebar>
  );
}
