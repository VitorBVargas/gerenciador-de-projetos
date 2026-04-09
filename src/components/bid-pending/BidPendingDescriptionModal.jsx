import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function BidPendingDescriptionModal({ open, onOpenChange, item }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Item do Edital</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-slate-300 whitespace-pre-wrap leading-6">
          {item?.bid_item_description || 'Sem descrição.'}
        </div>
      </DialogContent>
    </Dialog>
  );
}