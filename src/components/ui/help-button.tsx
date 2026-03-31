'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { HelpCircle } from 'lucide-react';
import { ScrollArea } from './scroll-area';

interface HelpButtonProps {
  title: string;
  content: string;
}

const parseContent = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    
    let isList = false;
    const elements = [];
    let listItems = [];

    for (const line of lines) {
        // Handle lists
        if (line.trim().startsWith('- ') || line.trim().startsWith('1. ')) {
            if (!isList) {
                isList = true;
                listItems = [];
            }
            listItems.push(line.replace(/^\s*-\s*|\d\.\s*/, ''));
            continue;
        }

        // If we were in a list and the new line is not a list item, push the list
        if (isList) {
            elements.push(<ul className="list-disc list-outside space-y-2 pl-6 my-3">{listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />)}</ul>);
            listItems = [];
            isList = false;
        }
        
        // Handle paragraphs and bold text
        const htmlContent = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        elements.push(<p className="mb-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: htmlContent }} />);
    }

    // Push any remaining list
    if (listItems.length > 0) {
        elements.push(<ul className="list-disc list-outside space-y-2 pl-6 my-3">{listItems.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />)}</ul>);
    }
    
    return elements;
};


export function HelpButton({ title, content }: HelpButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground/60 transition-all hover:text-muted-foreground hover:scale-110"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="sr-only">Ajuda</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
             <HelpCircle className="h-6 w-6 text-primary" />
             {title}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6 -mr-6">
            <div className="text-sm text-foreground/90 space-y-4 py-4">
                {parseContent(content).map((el, i) => <div key={i}>{el}</div>)}
            </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button>Entendi!</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
