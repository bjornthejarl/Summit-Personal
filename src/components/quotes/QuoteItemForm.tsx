'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { QuoteItemFormValues, quoteItemSchema } from '@/lib/validations/quote';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Package } from 'lucide-react';

interface CatalogItem {
  id: number;
  name: string;
  description: string | null;
  defaultUnitPrice: string;
  category: string | null;
}

interface QuoteItemFormProps {
  initialData?: Partial<QuoteItemFormValues>;
  onSubmit: (data: QuoteItemFormValues) => void;
  onCancel: () => void;
  onRemove?: () => void;
}

export function QuoteItemForm({
  initialData,
  onSubmit,
  onCancel,
  onRemove,
}: QuoteItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>('custom');
  const isEditing = !!initialData?.id;

  // Fetch catalog items on mount
  useEffect(() => {
    const fetchItems = async () => {
      setIsLoadingItems(true);
      try {
        const response = await fetch('/api/items?activeOnly=true&limit=100');
        if (response.ok) {
          const data = await response.json();
          setCatalogItems(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching catalog items:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  const form = useForm<QuoteItemFormValues>({
    resolver: zodResolver(quoteItemSchema),
    defaultValues: {
      id: initialData?.id,
      description: initialData?.description || '',
      quantity: initialData?.quantity || 1,
      unitPrice: initialData?.unitPrice || 0,
      amount: initialData?.amount || 0,
    },
  });

  // Auto-calculate amount when quantity or unitPrice changes
  const quantity = form.watch('quantity');
  const unitPrice = form.watch('unitPrice');

  useEffect(() => {
    const amount = Number(quantity) * Number(unitPrice);
    form.setValue('amount', amount);
  }, [quantity, unitPrice, form]);

  // Handle catalog item selection
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);

    if (itemId === 'custom') {
      // Reset for custom item
      form.setValue('description', '');
      form.setValue('unitPrice', 0);
    } else {
      // Find the selected catalog item and populate form
      const item = catalogItems.find(i => i.id.toString() === itemId);
      if (item) {
        form.setValue('description', item.description || item.name);
        form.setValue('unitPrice', parseFloat(item.defaultUnitPrice));
      }
    }
  };

  const handleSubmit = async (values: QuoteItemFormValues) => {
    setIsSubmitting(true);
    try {
      onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        {/* Item Selector */}
        {!isEditing && catalogItems.length > 0 && (
          <div className="space-y-2">
            <FormLabel className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Select from Catalog
            </FormLabel>
            <Select
              value={selectedItemId}
              onValueChange={handleItemSelect}
              disabled={isLoadingItems || isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a saved item or create custom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <span className="text-muted-foreground">✏️ Custom Item</span>
                </SelectItem>
                {catalogItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    <div className="flex justify-between items-center gap-4">
                      <span>{item.name}</span>
                      <span className="text-muted-foreground text-sm">
                        ${parseFloat(item.defaultUnitPrice).toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-6">
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Item description"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Unit Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    readOnly
                    {...field}
                    disabled={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          {onRemove && isEditing && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={onRemove}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? (isEditing ? 'Updating...' : 'Adding...')
              : (isEditing ? 'Update Item' : 'Add Item')
            }
          </Button>
        </div>
      </div>
    </Form>
  );
}