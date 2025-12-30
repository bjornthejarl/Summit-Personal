'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const itemFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    defaultUnitPrice: z.number().min(0, 'Price must be positive'),
    category: z.string().max(100).optional(),
    sku: z.string().max(100).optional(),
    isActive: z.boolean(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
    initialData?: Partial<{
        id: number;
        name: string;
        description: string | null;
        defaultUnitPrice: string;
        category: string | null;
        sku: string | null;
        isActive: boolean;
    }>;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ItemForm({ initialData, onSuccess, onCancel }: ItemFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!initialData?.id;

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            defaultUnitPrice: initialData?.defaultUnitPrice
                ? parseFloat(initialData.defaultUnitPrice)
                : 0,
            category: initialData?.category || '',
            sku: initialData?.sku || '',
            isActive: initialData?.isActive ?? true,
        },
    });

    const onSubmit = async (values: ItemFormValues) => {
        setIsSubmitting(true);

        try {
            const url = isEditing
                ? `/api/items/${initialData!.id}`
                : '/api/items';

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save item');
            }

            toast.success(isEditing ? 'Item updated successfully' : 'Item created successfully');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error((error as Error).message || 'Failed to save item');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Product or service name" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>SKU</FormLabel>
                                <FormControl>
                                    <Input placeholder="Product code (optional)" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="defaultUnitPrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Default Price *</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
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
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Services, Products" {...field} disabled={isSubmitting} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Detailed description of the item"
                                    {...field}
                                    disabled={isSubmitting}
                                    rows={3}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Active</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                    Make this item available for selection in quotes and invoices
                                </div>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2">
                    {onCancel && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting
                            ? (isEditing ? 'Updating...' : 'Creating...')
                            : (isEditing ? 'Update Item' : 'Create Item')
                        }
                    </Button>
                </div>
            </form>
        </Form>
    );
}
