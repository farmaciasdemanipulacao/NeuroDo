'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { projects } from '@/lib/data';
import type { Document as DocumentType, DocumentType as DocTypeEnum } from '@/lib/types';
import { FileText, PlusCircle, Search, Pin, Edit, Loader2, Trash2, Pencil } from 'lucide-react';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection, useUser, deleteDocumentNonBlocking, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DocumentForm } from './document-form';
import { cn } from '@/lib/utils';
import { HelpButton } from '../ui/help-button';
import { helpContent } from '@/lib/help-content';


const documentTypes: DocTypeEnum[] = ['Playbook', 'Planejamento', 'Estratégia', 'Processo', 'Referência', 'Checklist'];

export function DocumentsView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<DocumentType | null>(null);


  const documentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'documents'));
  }, [user, firestore]);

  const { data: documents, isLoading: areDocsLoading } = useCollection<DocumentType>(documentsQuery);

  const isLoading = isUserLoading || areDocsLoading;

  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    return documents.filter(doc => {
      const projectMatch = projectFilter === 'todos' || doc.projectId === projectFilter;
      const typeMatch = typeFilter === 'todos' || doc.type === typeFilter;
      const searchMatch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
      return projectMatch && typeMatch && searchMatch;
    });
  }, [documents, searchTerm, projectFilter, typeFilter]);

  const handleOpenCreateDialog = () => {
    setEditingDocument(null);
    setIsFormOpen(true);
  };
  
  const handleOpenEditDialog = (doc: DocumentType) => {
    setEditingDocument(doc);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingDocument(null);
  };

  const handleDeleteDocument = (docId: string) => {
    if (!firestore || !user) return;
    deleteDocumentNonBlocking(doc(firestore, 'users', user.uid, 'documents', docId));
    toast({
      title: 'Documento excluído',
      description: 'O documento foi removido da sua base de conhecimento.',
    });
  };

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
            <HelpButton title="Como usar Documentos" content={helpContent.documents} />
          </div>
          <Button onClick={handleOpenCreateDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>

        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDocument ? 'Editar Documento' : 'Criar Novo Documento'}</DialogTitle>
          </DialogHeader>
          <DocumentForm 
            key={editingDocument?.id || 'new'}
            document={editingDocument}
            onSuccess={handleFormSuccess}
          />
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos os Projetos</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    {documentTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && filteredDocuments.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map(doc => {
                const project = projects.find(p => p.id === doc.projectId);
                return (
                    <Card key={doc.id} className="flex flex-col group transition-all relative hover:border-primary/50">
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEditDialog(doc)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir Documento?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                        Tem certeza que deseja excluir o documento "{doc.title}"? Esta ação é permanente e não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteDocument(doc.id)}>Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        <div className="flex-grow cursor-pointer" onClick={() => handleOpenEditDialog(doc)}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant="secondary" className="mb-2">{doc.type}</Badge>
                                    <CardTitle className="text-xl pr-20">{doc.title}</CardTitle>
                                </div>
                                {doc.isPinned && <Pin className="h-5 w-5 text-accent flex-shrink-0" />}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-muted-foreground line-clamp-3">{doc.content}</p>
                            </CardContent>
                        </div>
                        <CardFooter className="flex justify-between items-center text-sm text-muted-foreground">
                            {project ? (
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project?.color }}></div>
                                <span>{project?.name}</span>
                              </div>
                            ) : <div></div>}
                             <p>
                               {doc.updatedAt && format(typeof doc.updatedAt === 'string' ? new Date(doc.updatedAt) : doc.updatedAt.toDate(), "dd MMM, yyyy", { locale: ptBR })}
                            </p>
                        </CardFooter>
                    </Card>
                )
            })}
          </div>
      )}
      
      {!isLoading && filteredDocuments.length === 0 && (
         <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum Documento Encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Tente ajustar seus filtros ou crie um novo documento.</p>
         </div>
      )}
    </>
  );
}

    