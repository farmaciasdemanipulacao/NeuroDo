'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookCheck,
  FileText,
  FlaskConical,
  LayoutDashboard,
  Map,
  Rocket,
  Timer,
  Target,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Users,
  CreditCard,
  LogOut,
  Settings,
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
import { useUser } from '@/firebase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/plan', icon: CalendarCheck, label: 'Plano do Dia' },
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

const projects = [
    { name: 'ENVOX', icon: Rocket, color: 'text-project-envox' },
    { name: 'FARMÁCIAS', icon: Rocket, color: 'text-project-farmacias' },
    { name: 'GERAÇÃO PJ', icon: Rocket, color: 'text-project-geracao-pj' },
    { name: 'FELIZMENTE', icon: Rocket, color: 'text-project-felizmente' },
    { name: 'INFLUENCERS', icon: Rocket, color: 'text-project-influencers' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const { user, isAdmin, signOut } = useUser();

  const isRevenueActive = pathname.startsWith('/dashboard/revenue');

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const sidebarHeader = (
    <div className="flex items-center p-3 pt-4">
      <div className="flex items-center group-data-[collapsible=icon]:hidden">
        <Logo variant="horizontal" size="xl" className="max-w-[18rem]" />
      </div>
      <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
        <Logo variant="icon" size="md" className="max-w-[4rem]" />
      </div>
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
                {projects.map(({ name, icon: Icon, color }) => (
                    <SidebarMenuItem key={name}>
                         <Link href="#" passHref onClick={handleLinkClick}>
                             <SidebarMenuButton tooltip={name} asChild>
                                 <span>
                                    <Icon className={cn(color)} />
                                    <span>{name}</span>
                                </span>
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                ))}
             </SidebarMenu>
        </SidebarContent>

        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
