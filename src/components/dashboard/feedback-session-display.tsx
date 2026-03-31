'use client';

import { GenerateFeedbackSessionOutput } from '@/lib/types';
import { Button } from '../ui/button';
import { DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface FeedbackSessionDisplayProps {
  script: GenerateFeedbackSessionOutput;
  memberName: string;
  onBack: () => void;
}

export function FeedbackSessionDisplay({ script, memberName, onBack }: FeedbackSessionDisplayProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const sections = [
    { title: 'Abertura (Criando Segurança)', content: script.opening, id: 'opening' },
    { title: 'Ponto Positivo (Reconhecimento)', content: script.praisePoints, id: 'praise' },
    { title: 'Ponto de Desenvolvimento (Oportunidade)', content: script.developmentPoints, id: 'dev' },
    { title: 'Próximos Passos (Alinhamento)', content: script.nextSteps, id: 'next' },
    { title: 'Encerramento (Reforço Positivo)', content: script.closing, id: 'closing' },
  ];

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Roteiro de Feedback para {memberName}</DialogTitle>
        <DialogDescription>
          Use este roteiro como um guia, não como um script rígido. Adapte as palavras para soarem naturais para você.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[60vh] mt-4 pr-4">
        <Accordion type="multiple" defaultValue={['opening', 'praise', 'dev', 'next', 'closing']} className="w-full">
          {sections.map(section => (
            <AccordionItem value={section.id} key={section.id}>
              <AccordionTrigger className="text-left hover:no-underline">{section.title}</AccordionTrigger>
              <AccordionContent>
                <div className="relative p-4 bg-muted/50 rounded-md">
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                     onClick={() => handleCopy(section.content, section.id)}
                   >
                     {copiedSection === section.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                   </Button>
                   <p className="text-sm whitespace-pre-wrap pr-8">{section.content}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    </div>
  );
}
